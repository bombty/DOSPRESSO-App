import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

import { useDynamicPermissions } from "@/hooks/useDynamicPermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Zap,
  Target,
  TrendingUp,
  Flame,
  Settings2,
  Library,
  ClipboardList,
  ShieldCheck,
  Signal,
  UserCog,
  Eye,
  Home,
  Video,
} from "lucide-react";

const AcademyMyPath = lazy(() => import("./academy-my-path"));
const Academy = lazy(() => import("./academy"));
const AcademyHQ = lazy(() => import("./academy-hq"));
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

interface TabConfig {
  id: string;
  label: string;
  labelTr: string;
  icon: React.ReactNode;
  permissionModule?: string;
  group: string;
  roleVisibility: RoleVisibility;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

interface TabGroup {
  id: string;
  label: string;
  labelTr: string;
  icon: React.ReactNode;
  roleVisibility: RoleVisibility;
}

const TAB_GROUPS: TabGroup[] = [
  { id: "egitimler", label: "Training", labelTr: "Eğitimler", icon: <BookOpen className="h-4 w-4" />, roleVisibility: "employee" },
  { id: "webinarlar", label: "Webinars", labelTr: "Webinarlar", icon: <Video className="h-4 w-4" />, roleVisibility: "all" },
  { id: "onboarding", label: "Onboarding", labelTr: "Onboarding", icon: <ClipboardList className="h-4 w-4" />, roleVisibility: "supervisor" },
  { id: "basarilarim", label: "Achievements", labelTr: "Başarılarım", icon: <Trophy className="h-4 w-4" />, roleVisibility: "employee" },
  { id: "kariyer-yolum", label: "Career Path", labelTr: "Kariyer Yolum", icon: <Target className="h-4 w-4" />, roleVisibility: "employee" },
  { id: "ekip-takibi", label: "Team Tracking", labelTr: "Ekip Takibi", icon: <Eye className="h-4 w-4" />, roleVisibility: "supervisor" },
  { id: "yonetim", label: "Management", labelTr: "Yönetim", icon: <UserCog className="h-4 w-4" />, roleVisibility: "coach" },
];

const AKADEMI_TABS: TabConfig[] = [
  {
    id: "genel-egitimler",
    label: "My Modules",
    labelTr: "Modüllerim",
    icon: <GraduationCap className="h-4 w-4" />,
    permissionModule: "academy",
    group: "egitimler",
    roleVisibility: "employee",
    component: Academy
  },
  {
    id: "kesfet",
    label: "Explore",
    labelTr: "Keşfet",
    icon: <Eye className="h-4 w-4" />,
    permissionModule: "academy",
    group: "egitimler",
    roleVisibility: "employee",
    component: AcademyExplore
  },
  {
    id: "bilgi-bankasi",
    label: "Knowledge Base",
    labelTr: "Bilgi Bankası",
    icon: <BookOpen className="h-4 w-4" />,
    permissionModule: "knowledge_base",
    group: "egitimler",
    roleVisibility: "employee",
    component: KnowledgeBase
  },
  {
    id: "webinarlar",
    label: "Webinars",
    labelTr: "Webinarlar",
    icon: <Video className="h-4 w-4" />,
    permissionModule: "academy",
    group: "webinarlar",
    roleVisibility: "all",
    component: AcademyWebinars
  },
  {
    id: "personel-onboarding",
    label: "Employee Onboarding",
    labelTr: "Personel Onboarding",
    icon: <Users className="h-4 w-4" />,
    permissionModule: "academy",
    group: "onboarding",
    roleVisibility: "coach",
    component: PersonelOnboarding
  },
  {
    id: "onboarding-programlar",
    label: "Onboarding Programs",
    labelTr: "Onboarding Programları",
    icon: <GraduationCap className="h-4 w-4" />,
    permissionModule: "academy",
    group: "onboarding",
    roleVisibility: "supervisor",
    component: OnboardingProgramlar
  },
  {
    id: "supervisor-onboarding",
    label: "Onboarding Approvals",
    labelTr: "Onboarding Onayları",
    icon: <ClipboardList className="h-4 w-4" />,
    permissionModule: "academy_supervisor",
    group: "onboarding",
    roleVisibility: "supervisor",
    component: SupervisorOnboarding
  },
  {
    id: "hq-yonetim",
    label: "Onboarding Studio",
    labelTr: "Onboarding Studio",
    icon: <ClipboardList className="h-4 w-4" />,
    permissionModule: "academy_admin",
    group: "onboarding",
    roleVisibility: "coach",
    component: CoachOnboardingStudio
  },
  {
    id: "rozetler",
    label: "Badges",
    labelTr: "Rozetlerim",
    icon: <Award className="h-4 w-4" />,
    permissionModule: "badges",
    group: "basarilarim",
    roleVisibility: "employee",
    component: AcademyBadges
  },
  {
    id: "sertifikalar",
    label: "Certificates",
    labelTr: "Sertifikalarım",
    icon: <Medal className="h-4 w-4" />,
    permissionModule: "certificates",
    group: "basarilarim",
    roleVisibility: "employee",
    component: AcademyCertificates
  },
  {
    id: "siralama",
    label: "Leaderboard",
    labelTr: "Sıralama",
    icon: <Trophy className="h-4 w-4" />,
    permissionModule: "leaderboard",
    group: "basarilarim",
    roleVisibility: "employee",
    component: AcademyLeaderboard
  },
  {
    id: "basarilar",
    label: "Achievements",
    labelTr: "Başarılarım",
    icon: <Star className="h-4 w-4" />,
    permissionModule: "achievements",
    group: "basarilarim",
    roleVisibility: "employee",
    component: AcademyAchievements
  },
  {
    id: "seri-takibi",
    label: "Streak Tracker",
    labelTr: "Seri Takibi",
    icon: <Flame className="h-4 w-4" />,
    permissionModule: "streak_tracker",
    group: "basarilarim",
    roleVisibility: "employee",
    component: AcademyStreakTracker
  },
  {
    id: "takim-yarismalar",
    label: "Team Competitions",
    labelTr: "Takım Yarışmaları",
    icon: <Users className="h-4 w-4" />,
    permissionModule: "team_competitions",
    group: "basarilarim",
    roleVisibility: "all",
    component: AcademyTeamCompetitions
  },
  {
    id: "benim-yolum",
    label: "My Path",
    labelTr: "Benim Yolum",
    icon: <Target className="h-4 w-4" />,
    permissionModule: "academy",
    group: "kariyer-yolum",
    roleVisibility: "employee",
    component: AcademyMyPath
  },
  {
    id: "ogrenme-yollari",
    label: "Learning Paths",
    labelTr: "Öğrenme Yolları",
    icon: <Route className="h-4 w-4" />,
    permissionModule: "learning_paths",
    group: "kariyer-yolum",
    roleVisibility: "all",
    component: AcademyLearningPaths
  },
  {
    id: "uyarlanabilir-motor",
    label: "Adaptive Engine",
    labelTr: "Uyarlanabilir Motor",
    icon: <Brain className="h-4 w-4" />,
    permissionModule: "adaptive_engine",
    group: "kariyer-yolum",
    roleVisibility: "all",
    component: AcademyAdaptiveEngine
  },
  {
    id: "supervisor",
    label: "Supervisor View",
    labelTr: "Ekip Eğitim Takibi",
    icon: <Eye className="h-4 w-4" />,
    permissionModule: "academy_supervisor",
    group: "ekip-takibi",
    roleVisibility: "supervisor",
    component: AcademySupervisor
  },
  {
    id: "coach-icerik-kutuphanesi",
    label: "Content Library",
    labelTr: "İçerik Kütüphanesi",
    icon: <Library className="h-4 w-4" />,
    permissionModule: "academy",
    group: "yonetim",
    roleVisibility: "coach",
    component: CoachContentLibrary
  },
  {
    id: "icerik-yonetimi",
    label: "Content Management",
    labelTr: "İçerik Yönetimi",
    icon: <Settings2 className="h-4 w-4" />,
    permissionModule: "academy",
    group: "yonetim",
    roleVisibility: "coach",
    component: AcademyContentManagement
  },
  {
    id: "coach-gate-yonetim",
    label: "Gate Management",
    labelTr: "Gate Yönetimi",
    icon: <ShieldCheck className="h-4 w-4" />,
    permissionModule: "academy",
    group: "yonetim",
    roleVisibility: "coach",
    component: CoachGateManagement
  },
  {
    id: "coach-kpi-sinyalleri",
    label: "KPI Signals",
    labelTr: "KPI Sinyalleri",
    icon: <Signal className="h-4 w-4" />,
    permissionModule: "academy",
    group: "yonetim",
    roleVisibility: "coach",
    component: CoachKpiSignals
  },
  {
    id: "coach-takim-ilerleme",
    label: "Team Progress",
    labelTr: "Takım İlerlemesi",
    icon: <Users className="h-4 w-4" />,
    permissionModule: "academy",
    group: "yonetim",
    roleVisibility: "coach",
    component: CoachTeamProgress
  },
  {
    id: "analitik",
    label: "Analytics",
    labelTr: "Analitik & Raporlar",
    icon: <BarChart3 className="h-4 w-4" />,
    permissionModule: "academy_analytics",
    group: "yonetim",
    roleVisibility: "coach",
    component: AcademyAnalytics
  },
  {
    id: "ilerleme-ozeti",
    label: "Progress Overview",
    labelTr: "İlerleme Özeti",
    icon: <TrendingUp className="h-4 w-4" />,
    permissionModule: "progress_overview",
    group: "yonetim",
    roleVisibility: "coach",
    component: AcademyProgressOverview
  },
  {
    id: "kohort-analitik",
    label: "Cohort Analytics",
    labelTr: "Kohort Analitik",
    icon: <Target className="h-4 w-4" />,
    permissionModule: "cohort_analytics",
    group: "yonetim",
    roleVisibility: "coach",
    component: AcademyCohortAnalytics
  },
  {
    id: "sube-analitik",
    label: "Branch Analytics",
    labelTr: "Şube Analitik",
    icon: <BarChart3 className="h-4 w-4" />,
    permissionModule: "branch_analytics",
    group: "yonetim",
    roleVisibility: "coach",
    component: AcademyBranchAnalytics
  },
  {
    id: "ai-kanit",
    label: "AI Evidence",
    labelTr: "AI Kanıt",
    icon: <Brain className="h-4 w-4" />,
    permissionModule: "academy",
    group: "yonetim",
    roleVisibility: "coach",
    component: AcademyAiPanel
  },
  {
    id: "sosyal-gruplar",
    label: "Social Groups",
    labelTr: "Sosyal Gruplar",
    icon: <Users className="h-4 w-4" />,
    permissionModule: "social_groups",
    group: "yonetim",
    roleVisibility: "coach",
    component: AcademySocialGroups
  },
];

function TabSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex gap-4">
        <Skeleton className="h-24 w-48" />
        <Skeleton className="h-24 w-48" />
        <Skeleton className="h-24 w-48" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

const TAB_URL_MAP: Record<string, string> = {
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

function getTabFromUrl(rawPath: string, viewMode: AcademyViewMode): string | null {
  const pathname = rawPath.split("?")[0];
  if (pathname === "/akademi" || pathname === "/akademi/") return null;
  const sortedEntries = Object.entries(TAB_URL_MAP)
    .sort((a, b) => b[1].length - a[1].length);
  for (const [tabId, url] of sortedEntries) {
    if (pathname === url || pathname.startsWith(url + "/")) {
      return tabId;
    }
  }
  return null;
}

export default function AkademiMegaModule() {
  const { user } = useAuth();
  const { canAccess } = useDynamicPermissions();
  const [location, setLocation] = useLocation();

  const viewMode = getAcademyViewMode(user?.role);

  const visibleTabs = AKADEMI_TABS.filter(tab => {
    if (user?.role === 'admin') {
      // admin sees everything
    } else if (tab.roleVisibility !== 'all') {
      if (tab.roleVisibility === 'coach' && viewMode !== 'coach') return false;
      if (tab.roleVisibility === 'employee') {
        if (viewMode === 'coach') return false;
      }
      if (tab.roleVisibility === 'supervisor') {
        if (viewMode !== 'supervisor' && viewMode !== 'coach') return false;
      }
    }
    if (!tab.permissionModule) return true;
    if (!user?.role) return false;
    if (user.role === 'admin') return true;
    return canAccess(tab.permissionModule!, 'view');
  });

  const visibleGroups = TAB_GROUPS.filter(group => {
    if (user?.role === 'admin') {
      // admin sees all groups
    } else if (group.roleVisibility !== 'all') {
      if (group.roleVisibility === 'coach' && viewMode !== 'coach') return false;
      if (group.roleVisibility === 'employee' && viewMode === 'coach') return false;
      if (group.roleVisibility === 'supervisor') {
        if (viewMode !== 'supervisor' && viewMode !== 'coach') return false;
      }
    }
    return visibleTabs.some(tab => tab.group === group.id);
  });

  const firstVisibleGroup = visibleGroups[0]?.id || "egitimler";
  
  const initialTab = getTabFromUrl(location, viewMode);
  const initialTabConfig = initialTab ? visibleTabs.find(t => t.id === initialTab) : null;
  const initialGroup = initialTabConfig?.group || firstVisibleGroup;
  
  const [activeGroup, setActiveGroup] = useState(
    visibleGroups.find(g => g.id === initialGroup) ? initialGroup : firstVisibleGroup
  );

  const tabsInActiveGroup = visibleTabs.filter(tab => tab.group === activeGroup);
  const firstTabInGroup = tabsInActiveGroup[0]?.id || "";
  const [activeTab, setActiveTab] = useState(
    initialTabConfig 
      ? initialTab! 
      : firstTabInGroup
  );
  
  useEffect(() => {
    if (!visibleGroups.find(g => g.id === activeGroup)) {
      setActiveGroup(firstVisibleGroup);
    }
  }, [visibleGroups, activeGroup, firstVisibleGroup]);
  
  useEffect(() => {
    const cp = location.split("?")[0];
    if (cp === "/akademi" || cp === "/akademi/" || cp === "/egitim" || cp === "/egitim/") return;
    if (!tabsInActiveGroup.find(t => t.id === activeTab)) {
      setActiveTab(firstTabInGroup);
      const url = TAB_URL_MAP[firstTabInGroup];
      if (url && location !== url) {
        setLocation(url);
      }
    }
  }, [tabsInActiveGroup, activeTab, firstTabInGroup, location]);
  
  useEffect(() => {
    const tabFromUrl = getTabFromUrl(location, viewMode);
    if (tabFromUrl && tabFromUrl !== activeTab) {
      const tabConfig = visibleTabs.find(t => t.id === tabFromUrl);
      if (tabConfig) {
        if (tabConfig.group !== activeGroup) {
          setActiveGroup(tabConfig.group);
        }
        setActiveTab(tabFromUrl);
      }
    }
  }, [location, visibleTabs]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const url = TAB_URL_MAP[tabId];
    if (url && location !== url) {
      setLocation(url);
    }
  };

  const handleGroupChange = (groupId: string) => {
    setActiveGroup(groupId);
    const firstTab = visibleTabs.find(t => t.group === groupId);
    if (firstTab) {
      setActiveTab(firstTab.id);
      const url = TAB_URL_MAP[firstTab.id];
      if (url && location !== url) {
        setLocation(url);
      }
    }
  };

  const cleanPath = location.split("?")[0];
  const isBasePath = cleanPath === "/akademi" || cleanPath === "/akademi/" || cleanPath === "/egitim" || cleanPath === "/egitim/";

  if (visibleTabs.length === 0) {
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

  if (isBasePath) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-xl font-semibold">DOSPRESSO Akademi</h1>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const defaultTab = getAcademyDefaultTab(viewMode);
                  const url = TAB_URL_MAP[defaultTab];
                  if (url) setLocation(url);
                }}
                data-testid="button-all-tabs"
              >
                <BookOpen className="h-4 w-4 mr-1" />
                Tüm Modüller
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <Suspense fallback={<TabSkeleton />}>
            <AcademyLandingPage />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/akademi")}
              data-testid="button-back-landing"
            >
              <Home className="h-5 w-5" />
            </Button>
            <GraduationCap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h1 className="text-xl font-semibold">DOSPRESSO Akademi</h1>
              <p className="text-sm text-muted-foreground">
                {viewMode === 'coach' ? 'Eğitim Yönetim Paneli' : viewMode === 'supervisor' ? 'Ekip Eğitim Takibi' : 'Eğitim ve Gelişim Platformu'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="px-4 pb-2">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2">
              {visibleGroups.map((group) => {
                const tabCount = visibleTabs.filter(t => t.group === group.id).length;
                return (
                  <button
                    key={group.id}
                    onClick={() => handleGroupChange(group.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeGroup === group.id 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted hover:bg-muted/80"
                    }`}
                    data-testid={`group-akademi-${group.id}`}
                  >
                    {group.icon}
                    <span>{group.labelTr}</span>
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {tabCount}
                    </Badge>
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      <Tabs 
        value={activeTab || firstTabInGroup}
        onValueChange={handleTabChange} 
        className="flex-1 flex flex-col"
      >
        <div className="border-b px-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex h-auto p-1 bg-transparent gap-1">
              {tabsInActiveGroup.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                  data-testid={`tab-akademi-${tab.id}`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.labelTr}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="flex-1 overflow-auto">
          {visibleTabs.map((tab) => (
            <TabsContent 
              key={tab.id} 
              value={tab.id} 
              className="h-full m-0 p-0"
              data-testid={`content-akademi-${tab.id}`}
            >
              <Suspense fallback={<TabSkeleton />}>
                <tab.component />
              </Suspense>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
