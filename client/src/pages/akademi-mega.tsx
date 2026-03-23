import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useDynamicPermissions } from "@/hooks/useDynamicPermissions";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModuleLayout, type KPIMetric } from "@/components/module-layout/ModuleLayout";
import type { SidebarSection } from "@/components/module-layout/ModuleSidebar";
import {
  GraduationCap,
  BookOpen,
  Users,
  BarChart3,
  Award,
  Medal,
  Trophy,
  Route,
  Brain,
  Star,
  Flame,
  Target,
  TrendingUp,
  Settings2,
  Library,
  ClipboardList,
  ShieldCheck,
  Signal,
  UserCog,
  Eye,
  Home,
  Video,
  CheckCircle2,
} from "lucide-react";

const AcademyMyPath = lazy(() => import("./academy-my-path"));
const Academy = lazy(() => import("./academy"));
const AcademyHQ = lazy(() => import("./akademi-hq"));
const AcademySupervisor = lazy(() => import("./academy-supervisor"));
const CoachOnboardingStudio = lazy(() => import("./coach-onboarding-studio"));
const SupervisorOnboarding = lazy(() => import("./supervisor-onboarding"));
const PersonelOnboarding = lazy(() => import("./personel-onboarding"));
const OnboardingProgramlar = lazy(() => import("./onboarding-programlar"));
const KnowledgeBase = lazy(() => import("./knowledge-base"));
const AcademyAnalytics = lazy(() => import("./academy-analytics"));
const AcademyBadges = lazy(() => import("./academy-badges"));
const AcademyCertificates = lazy(() => import("./academy-certificates"));
const AcademyLeaderboard = lazy(() => import("./academy-leaderboard"));
const AcademyLearningPaths = lazy(() => import("./academy-learning-paths"));
const AcademyAchievements = lazy(() => import("./academy-achievements"));
const AcademyAdaptiveEngine = lazy(() => import("./academy-adaptive-engine"));
const AcademySocialGroups = lazy(() => import("./academy-social-groups"));
const AcademyTeamCompetitions = lazy(() => import("./academy-team-competitions"));
const AcademyProgressOverview = lazy(() => import("./academy-progress-overview"));
const AcademyCohortAnalytics = lazy(() => import("./academy-cohort-analytics"));
const AcademyBranchAnalytics = lazy(() => import("./academy-branch-analytics"));
const AcademyStreakTracker = lazy(() => import("./academy-streak-tracker"));
const CoachContentLibrary = lazy(() => import("./coach-content-library"));
const CoachGateManagement = lazy(() => import("./coach-gate-management"));
const CoachKpiSignals = lazy(() => import("./coach-kpi-signals"));
const CoachTeamProgress = lazy(() => import("./coach-team-progress"));
const AcademyAiPanel = lazy(() => import("./academy-ai-panel"));
const AcademyExplore = lazy(() => import("./academy-explore"));
const AcademyContentManagement = lazy(() => import("./academy-content-management"));
const AcademyWebinars = lazy(() => import("./academy-webinars"));
const AcademyLandingPage = lazy(() => import("./academy-landing"));

import {
  type AcademyViewMode,
  type AcademyTabVisibility,
  getAcademyViewMode,
  getAcademyDefaultTab,
} from "@shared/permissions";

type RoleVisibility = AcademyTabVisibility;

interface ViewConfig {
  id: string;
  labelTr: string;
  icon: React.ReactNode;
  permissionModule?: string;
  section: string;
  roleVisibility: RoleVisibility;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

const VIEWS: ViewConfig[] = [
  { id: "genel-egitimler", labelTr: "Modüllerim", icon: <GraduationCap />, permissionModule: "academy", section: "egitimler", roleVisibility: "employee", component: Academy },
  { id: "kesfet", labelTr: "Keşfet", icon: <Eye />, permissionModule: "academy", section: "egitimler", roleVisibility: "employee", component: AcademyExplore },
  { id: "bilgi-bankasi", labelTr: "Bilgi Bankası", icon: <BookOpen />, permissionModule: "knowledge_base", section: "egitimler", roleVisibility: "employee", component: KnowledgeBase },
  { id: "webinarlar", labelTr: "Webinarlar", icon: <Video />, permissionModule: "academy", section: "egitimler", roleVisibility: "all", component: AcademyWebinars },
  { id: "personel-onboarding", labelTr: "Personel Onboarding", icon: <Users />, permissionModule: "academy", section: "onboarding", roleVisibility: "coach", component: PersonelOnboarding },
  { id: "onboarding-programlar", labelTr: "Onboarding Programları", icon: <GraduationCap />, permissionModule: "academy", section: "onboarding", roleVisibility: "supervisor", component: OnboardingProgramlar },
  { id: "supervisor-onboarding", labelTr: "Onboarding Onayları", icon: <ClipboardList />, permissionModule: "academy_supervisor", section: "onboarding", roleVisibility: "supervisor", component: SupervisorOnboarding },
  { id: "hq-yonetim", labelTr: "Onboarding Studio", icon: <ClipboardList />, permissionModule: "academy_admin", section: "onboarding", roleVisibility: "coach", component: CoachOnboardingStudio },
  { id: "rozetler", labelTr: "Rozetlerim", icon: <Award />, permissionModule: "badges", section: "basarilarim", roleVisibility: "employee", component: AcademyBadges },
  { id: "sertifikalar", labelTr: "Sertifikalarım", icon: <Medal />, permissionModule: "certificates", section: "basarilarim", roleVisibility: "employee", component: AcademyCertificates },
  { id: "siralama", labelTr: "Sıralama", icon: <Trophy />, permissionModule: "leaderboard", section: "basarilarim", roleVisibility: "employee", component: AcademyLeaderboard },
  { id: "basarilar", labelTr: "Başarılarım", icon: <Star />, permissionModule: "achievements", section: "basarilarim", roleVisibility: "employee", component: AcademyAchievements },
  { id: "seri-takibi", labelTr: "Seri Takibi", icon: <Flame />, permissionModule: "streak_tracker", section: "basarilarim", roleVisibility: "employee", component: AcademyStreakTracker },
  { id: "takim-yarismalar", labelTr: "Takım Yarışmaları", icon: <Users />, permissionModule: "team_competitions", section: "basarilarim", roleVisibility: "all", component: AcademyTeamCompetitions },
  { id: "benim-yolum", labelTr: "Benim Yolum", icon: <Target />, permissionModule: "academy", section: "kariyer", roleVisibility: "employee", component: AcademyMyPath },
  { id: "ogrenme-yollari", labelTr: "Öğrenme Yolları", icon: <Route />, permissionModule: "learning_paths", section: "kariyer", roleVisibility: "all", component: AcademyLearningPaths },
  { id: "uyarlanabilir-motor", labelTr: "Uyarlanabilir Motor", icon: <Brain />, permissionModule: "adaptive_engine", section: "kariyer", roleVisibility: "all", component: AcademyAdaptiveEngine },
  { id: "supervisor", labelTr: "Ekip Eğitim Takibi", icon: <Eye />, permissionModule: "academy_supervisor", section: "ekip-takibi", roleVisibility: "supervisor", component: AcademySupervisor },
  { id: "coach-icerik-kutuphanesi", labelTr: "İçerik Kütüphanesi", icon: <Library />, permissionModule: "academy", section: "yonetim", roleVisibility: "coach", component: CoachContentLibrary },
  { id: "icerik-yonetimi", labelTr: "İçerik Yönetimi", icon: <Settings2 />, permissionModule: "academy", section: "yonetim", roleVisibility: "coach", component: AcademyContentManagement },
  { id: "coach-gate-yonetim", labelTr: "Gate Yönetimi", icon: <ShieldCheck />, permissionModule: "academy", section: "yonetim", roleVisibility: "coach", component: CoachGateManagement },
  { id: "coach-kpi-sinyalleri", labelTr: "KPI Sinyalleri", icon: <Signal />, permissionModule: "academy", section: "yonetim", roleVisibility: "coach", component: CoachKpiSignals },
  { id: "coach-takim-ilerleme", labelTr: "Takım İlerlemesi", icon: <Users />, permissionModule: "academy", section: "yonetim", roleVisibility: "coach", component: CoachTeamProgress },
  { id: "analitik", labelTr: "Analitik & Raporlar", icon: <BarChart3 />, permissionModule: "academy_analytics", section: "yonetim", roleVisibility: "coach", component: AcademyAnalytics },
  { id: "ilerleme-ozeti", labelTr: "İlerleme Özeti", icon: <TrendingUp />, permissionModule: "progress_overview", section: "yonetim", roleVisibility: "coach", component: AcademyProgressOverview },
  { id: "kohort-analitik", labelTr: "Kohort Analitik", icon: <Target />, permissionModule: "cohort_analytics", section: "yonetim", roleVisibility: "coach", component: AcademyCohortAnalytics },
  { id: "sube-analitik", labelTr: "Şube Analitik", icon: <BarChart3 />, permissionModule: "branch_analytics", section: "yonetim", roleVisibility: "coach", component: AcademyBranchAnalytics },
  { id: "ai-kanit", labelTr: "AI Kanıt", icon: <Brain />, permissionModule: "academy", section: "yonetim", roleVisibility: "coach", component: AcademyAiPanel },
  { id: "sosyal-gruplar", labelTr: "Sosyal Gruplar", icon: <Users />, permissionModule: "social_groups", section: "yonetim", roleVisibility: "coach", component: AcademySocialGroups },
];

const VIEW_URL_MAP: Record<string, string> = {
  "genel-egitimler": "/akademi/genel-egitimler",
  "kesfet": "/akademi/kesfet",
  "bilgi-bankasi": "/akademi/bilgi-bankasi",
  "webinarlar": "/akademi/webinarlar",
  "personel-onboarding": "/akademi/personel-onboarding",
  "onboarding-programlar": "/akademi/onboarding-programlar",
  "supervisor-onboarding": "/akademi/supervisor-onboarding",
  "hq-yonetim": "/akademi/onboarding-studio",
  "rozetler": "/akademi/rozetler",
  "sertifikalar": "/akademi/sertifikalar",
  "siralama": "/akademi/siralama",
  "basarilar": "/akademi/basarilar",
  "seri-takibi": "/akademi/seri-takibi",
  "takim-yarismalar": "/akademi/takim-yarismalar",
  "benim-yolum": "/akademi/benim-yolum",
  "ogrenme-yollari": "/akademi/ogrenme-yollari",
  "uyarlanabilir-motor": "/akademi/uyarlanabilir-motor",
  "supervisor": "/akademi/supervisor",
  "coach-icerik-kutuphanesi": "/akademi/icerik-kutuphanesi",
  "icerik-yonetimi": "/akademi/icerik-yonetimi",
  "coach-gate-yonetim": "/akademi/gate-yonetim",
  "coach-kpi-sinyalleri": "/akademi/kpi-sinyalleri",
  "coach-takim-ilerleme": "/akademi/takim-ilerleme",
  "analitik": "/akademi/analitik",
  "ilerleme-ozeti": "/akademi/ilerleme-ozeti",
  "kohort-analitik": "/akademi/kohort-analitik",
  "sube-analitik": "/akademi/sube-analitik",
  "ai-kanit": "/akademi/ai-kanit",
  "sosyal-gruplar": "/akademi/sosyal-gruplar",
};

function getViewFromUrl(rawPath: string): string | null {
  const pathname = rawPath.split("?")[0];
  if (pathname === "/akademi" || pathname === "/akademi/") return null;
  const sortedEntries = Object.entries(VIEW_URL_MAP).sort((a, b) => b[1].length - a[1].length);
  for (const [viewId, url] of sortedEntries) {
    if (pathname === url || pathname.startsWith(url + "/")) return viewId;
  }
  return null;
}

function ContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-24 w-48" />
        <Skeleton className="h-24 w-48" />
        <Skeleton className="h-24 w-48" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function AkademiMegaModule() {
  const { user } = useAuth();
  const { canAccess } = useDynamicPermissions();
  const [location, setLocation] = useLocation();

  const viewMode = getAcademyViewMode(user?.role);

  const visibleViews = VIEWS.filter((v) => {
    if (user?.role === "admin") { /* admin sees everything */ }
    else if (v.roleVisibility !== "all") {
      if (v.roleVisibility === "coach" && viewMode !== "coach") return false;
      if (v.roleVisibility === "employee" && viewMode === "coach") return false;
      if (v.roleVisibility === "supervisor" && viewMode !== "supervisor" && viewMode !== "coach") return false;
    }
    if (!v.permissionModule) return true;
    if (!user?.role) return false;
    if (user.role === "admin") return true;
    return canAccess(v.permissionModule!, "view");
  });

  const firstVisible = visibleViews[0]?.id || "genel-egitimler";

  const initialView = getViewFromUrl(location);
  const [activeView, setActiveView] = useState(
    initialView && visibleViews.find((v) => v.id === initialView) ? initialView : firstVisible
  );

  const cleanPath = location.split("?")[0];
  const isBasePath = cleanPath === "/akademi" || cleanPath === "/akademi/" || cleanPath === "/egitim" || cleanPath === "/egitim/";
  const [showLanding, setShowLanding] = useState(isBasePath);

  useEffect(() => {
    const cp = location.split("?")[0];
    const isBP = cp === "/akademi" || cp === "/akademi/" || cp === "/egitim" || cp === "/egitim/";
    setShowLanding(isBP);

    if (!isBP) {
      const vFromUrl = getViewFromUrl(location);
      if (vFromUrl && vFromUrl !== activeView && visibleViews.find((v) => v.id === vFromUrl)) {
        setActiveView(vFromUrl);
      }
    }
  }, [location, visibleViews]);

  useEffect(() => {
    if (!visibleViews.find((v) => v.id === activeView)) {
      setActiveView(firstVisible);
    }
  }, [visibleViews, activeView, firstVisible]);

  const handleViewChange = (viewId: string) => {
    setActiveView(viewId);
    setShowLanding(false);
    const url = VIEW_URL_MAP[viewId];
    if (url && location !== url) {
      setLocation(url);
    }
  };

  const { data: academyStats } = useQuery<{
    activeStudents?: number;
    completionRate?: number;
    avgQuizScore?: number;
    certificatesThisMonth?: number;
  }>({
    queryKey: ["/api/academy/stats"],
    enabled: !!user,
  });

  const kpiMetrics: KPIMetric[] = [
    { label: "Aktif Öğrenci", value: academyStats?.activeStudents ?? "—", icon: <Users className="h-4 w-4" /> },
    { label: "Tamamlama Oranı", value: academyStats?.completionRate != null ? `%${academyStats.completionRate}` : "—", icon: <CheckCircle2 className="h-4 w-4" /> },
    { label: "Ort. Quiz Puanı", value: academyStats?.avgQuizScore ?? "—", icon: <Target className="h-4 w-4" /> },
    { label: "Bu Ay Sertifika", value: academyStats?.certificatesThisMonth ?? "—", icon: <Medal className="h-4 w-4" /> },
  ];

  const sectionMap: Record<string, string> = {
    egitimler: "EĞİTİMLER",
    onboarding: "ONBOARDING",
    basarilarim: "BAŞARILARIM",
    kariyer: "KARİYER YOLUM",
    "ekip-takibi": "EKİP TAKİBİ",
    yonetim: "YÖNETİM",
  };

  const sidebarSections: SidebarSection[] = Object.entries(sectionMap)
    .map(([key, title]) => ({
      title,
      items: visibleViews
        .filter((v) => v.section === key)
        .map((v) => ({ id: v.id, label: v.labelTr, icon: v.icon })),
    }))
    .filter((s) => s.items.length > 0);

  if (visibleViews.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              DOSPRESSO Akademi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Bu modüle erişim yetkiniz bulunmamaktadır.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showLanding) {
    return (
      <ModuleLayout
        title="DOSPRESSO Akademi"
        description={viewMode === "coach" ? "Eğitim Yönetim Paneli" : viewMode === "supervisor" ? "Ekip Eğitim Takibi" : "Eğitim ve Gelişim Platformu"}
        icon={<GraduationCap className="h-6 w-6" />}
        kpiMetrics={kpiMetrics}
        sidebarSections={sidebarSections}
        activeView=""
        onViewChange={handleViewChange}
      >
        <Suspense fallback={<ContentSkeleton />}>
          <AcademyLandingPage />
        </Suspense>
      </ModuleLayout>
    );
  }

  const activeConfig = visibleViews.find((v) => v.id === activeView);

  return (
    <ModuleLayout
      title="DOSPRESSO Akademi"
      description={viewMode === "coach" ? "Eğitim Yönetim Paneli" : viewMode === "supervisor" ? "Ekip Eğitim Takibi" : "Eğitim ve Gelişim Platformu"}
      icon={<GraduationCap className="h-6 w-6" />}
      kpiMetrics={kpiMetrics}
      sidebarSections={sidebarSections}
      activeView={activeView}
      onViewChange={handleViewChange}
    >
      {activeConfig && (
        <Suspense fallback={<ContentSkeleton />}>
          <activeConfig.component />
        </Suspense>
      )}
    </ModuleLayout>
  );
}
