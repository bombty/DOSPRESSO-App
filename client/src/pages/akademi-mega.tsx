import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useDynamicPermissions } from "@/hooks/useDynamicPermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  Settings2
} from "lucide-react";

const Academy = lazy(() => import("./academy"));
const AcademyHQ = lazy(() => import("./academy-hq"));
const AcademySupervisor = lazy(() => import("./academy-supervisor"));
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

interface TabConfig {
  id: string;
  label: string;
  labelTr: string;
  icon: React.ReactNode;
  permissionModule?: string;
  group: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

interface TabGroup {
  id: string;
  label: string;
  labelTr: string;
  icon: React.ReactNode;
}

const TAB_GROUPS: TabGroup[] = [
  { id: "egitim", label: "Training", labelTr: "Eğitim", icon: <BookOpen className="h-4 w-4" /> },
  { id: "gamification", label: "Gamification", labelTr: "Oyunlaştırma", icon: <Trophy className="h-4 w-4" /> },
  { id: "analytics", label: "Analytics", labelTr: "Analitik", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "advanced", label: "Advanced", labelTr: "Gelişmiş", icon: <Zap className="h-4 w-4" /> }
];

const AKADEMI_TABS: TabConfig[] = [
  {
    id: "genel-egitimler",
    label: "General Training",
    labelTr: "Genel Eğitimler",
    icon: <GraduationCap className="h-4 w-4" />,
    permissionModule: "academy",
    group: "egitim",
    component: Academy
  },
  {
    id: "hq-yonetim",
    label: "HQ Management",
    labelTr: "HQ Yönetim Paneli",
    icon: <Settings2 className="h-4 w-4" />,
    permissionModule: "academy_admin",
    group: "egitim",
    component: AcademyHQ
  },
  {
    id: "bilgi-bankasi",
    label: "Knowledge Base",
    labelTr: "Bilgi Bankası",
    icon: <BookOpen className="h-4 w-4" />,
    permissionModule: "knowledge_base",
    group: "egitim",
    component: KnowledgeBase
  },
  {
    id: "rozetler",
    label: "Badges",
    labelTr: "Rozetler & Başarılar",
    icon: <Award className="h-4 w-4" />,
    permissionModule: "badges",
    group: "gamification",
    component: AcademyBadges
  },
  {
    id: "sertifikalar",
    label: "Certificates",
    labelTr: "Sertifikalar",
    icon: <Medal className="h-4 w-4" />,
    permissionModule: "certificates",
    group: "gamification",
    component: AcademyCertificates
  },
  {
    id: "siralama",
    label: "Leaderboard",
    labelTr: "Sıralama",
    icon: <Trophy className="h-4 w-4" />,
    permissionModule: "leaderboard",
    group: "gamification",
    component: AcademyLeaderboard
  },
  {
    id: "basarilar",
    label: "Achievements",
    labelTr: "Başarılar",
    icon: <Star className="h-4 w-4" />,
    permissionModule: "achievements",
    group: "gamification",
    component: AcademyAchievements
  },
  {
    id: "takim-yarismalar",
    label: "Team Competitions",
    labelTr: "Takım Yarışmaları",
    icon: <Users className="h-4 w-4" />,
    permissionModule: "team_competitions",
    group: "gamification",
    component: AcademyTeamCompetitions
  },
  {
    id: "seri-takibi",
    label: "Streak Tracker",
    labelTr: "Seri Takibi",
    icon: <Flame className="h-4 w-4" />,
    permissionModule: "streak_tracker",
    group: "gamification",
    component: AcademyStreakTracker
  },
  {
    id: "analitik",
    label: "Analytics",
    labelTr: "Analitik & Raporlar",
    icon: <BarChart3 className="h-4 w-4" />,
    permissionModule: "academy_analytics",
    group: "analytics",
    component: AcademyAnalytics
  },
  {
    id: "ilerleme-ozeti",
    label: "Progress Overview",
    labelTr: "İlerleme Özeti",
    icon: <TrendingUp className="h-4 w-4" />,
    permissionModule: "progress_overview",
    group: "analytics",
    component: AcademyProgressOverview
  },
  {
    id: "kohort-analitik",
    label: "Cohort Analytics",
    labelTr: "Kohort Analitik",
    icon: <Target className="h-4 w-4" />,
    permissionModule: "cohort_analytics",
    group: "analytics",
    component: AcademyCohortAnalytics
  },
  {
    id: "sube-analitik",
    label: "Branch Analytics",
    labelTr: "Şube Analitik",
    icon: <BarChart3 className="h-4 w-4" />,
    permissionModule: "branch_analytics",
    group: "analytics",
    component: AcademyBranchAnalytics
  },
  {
    id: "ogrenme-yollari",
    label: "Learning Paths",
    labelTr: "Öğrenme Yolları",
    icon: <Route className="h-4 w-4" />,
    permissionModule: "learning_paths",
    group: "advanced",
    component: AcademyLearningPaths
  },
  {
    id: "uyarlanabilir-motor",
    label: "Adaptive Engine",
    labelTr: "Uyarlanabilir Motor",
    icon: <Brain className="h-4 w-4" />,
    permissionModule: "adaptive_engine",
    group: "advanced",
    component: AcademyAdaptiveEngine
  },
  {
    id: "sosyal-gruplar",
    label: "Social Groups",
    labelTr: "Sosyal Gruplar",
    icon: <Users className="h-4 w-4" />,
    permissionModule: "social_groups",
    group: "advanced",
    component: AcademySocialGroups
  },
  {
    id: "supervisor",
    label: "Supervisor View",
    labelTr: "Supervisor Görünümü",
    icon: <Settings2 className="h-4 w-4" />,
    permissionModule: "academy_supervisor",
    group: "advanced",
    component: AcademySupervisor
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
  "genel-egitimler": "/akademi",
  "hq-yonetim": "/akademi/hq-yonetim",
  "bilgi-bankasi": "/akademi/bilgi-bankasi",
  "rozetler": "/akademi/rozetler",
  "sertifikalar": "/akademi/sertifikalar",
  "siralama": "/akademi/siralama",
  "basarilar": "/akademi/basarilar",
  "takim-yarismalar": "/akademi/takim-yarismalar",
  "seri-takibi": "/akademi/seri-takibi",
  "analitik": "/akademi/analitik",
  "ilerleme-ozeti": "/akademi/ilerleme-ozeti",
  "kohort-analitik": "/akademi/kohort-analitik",
  "sube-analitik": "/akademi/sube-analitik",
  "ogrenme-yollari": "/akademi/ogrenme-yollari",
  "uyarlanabilir-motor": "/akademi/uyarlanabilir-motor",
  "sosyal-gruplar": "/akademi/sosyal-gruplar",
  "supervisor": "/akademi/supervisor",
};

function getTabFromUrl(pathname: string): string | null {
  if (pathname === "/akademi" || pathname === "/akademi/") return "genel-egitimler";
  const sortedEntries = Object.entries(TAB_URL_MAP)
    .filter(([tabId]) => tabId !== "genel-egitimler")
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

  const visibleTabs = AKADEMI_TABS.filter(tab => {
    if (!tab.permissionModule) return true;
    if (!user?.role) return false;
    if (user.role === 'admin') return true;
    return canAccess(tab.permissionModule!, 'view');
  });

  const visibleGroups = TAB_GROUPS.filter(group => 
    visibleTabs.some(tab => tab.group === group.id)
  );

  const firstVisibleGroup = visibleGroups[0]?.id || "egitim";
  
  const initialTab = getTabFromUrl(location);
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
    if (!tabsInActiveGroup.find(t => t.id === activeTab)) {
      setActiveTab(firstTabInGroup);
      const url = TAB_URL_MAP[firstTabInGroup];
      if (url && location !== url) {
        setLocation(url);
      }
    }
  }, [tabsInActiveGroup, activeTab, firstTabInGroup]);
  
  useEffect(() => {
    const tabFromUrl = getTabFromUrl(location);
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

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="h-6 w-6 text-indigo-600" />
            <div>
              <h1 className="text-xl font-semibold">DOSPRESSO Akademi</h1>
              <p className="text-sm text-muted-foreground">Eğitim ve gelişim platformu</p>
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
