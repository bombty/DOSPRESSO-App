import { useState, useEffect, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import {
  Home,
  BookOpen,
  Video,
  Target,
  Flame,
  Eye,
  ArrowRight,
} from "lucide-react";

const HomeTab = lazy(() => import("./HomeTab"));
const TrainingTab = lazy(() => import("./TrainingTab"));
const WebinarTab = lazy(() => import("./WebinarTab"));
const CareerTab = lazy(() => import("./CareerTab"));

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  ceo: "CEO",
  cgo: "CGO",
  coach: "Koç",
  trainer: "Eğitmen",
  mudur: "Müdür",
  supervisor: "Süpervizör",
  barista: "Barista",
  bar_buddy: "Bar Buddy",
  stajyer: "Stajyer",
  muhasebe_ik: "Muhasebe/İK",
  fabrika_mudur: "Fabrika Müdür",
  kalite_kontrol: "Kalite Kontrol",
  depocu: "Depocu",
};

interface TabDef {
  id: string;
  label: string;
  icon: typeof Home;
}

const TABS: TabDef[] = [
  { id: "ana", label: "Ana Sayfa", icon: Home },
  { id: "egitimler", label: "Eğitimler", icon: BookOpen },
  { id: "webinar", label: "Webinar", icon: Video },
  { id: "kariyer", label: "Kariyer", icon: Target },
];

function TabSkeleton() {
  return (
    <div className="space-y-4 p-4" data-testid="tab-skeleton">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

const HQ_ROLES = ['admin', 'ceo', 'cgo', 'coach', 'trainer', 'kalite_kontrol', 'gida_muhendisi'];

export default function AkademiV3() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") || "ana";
  const urlCategory = urlParams.get("category") || undefined;
  const isPreviewMode = urlParams.get("preview") === "true";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(urlCategory);
  const isHQUser = user && HQ_ROLES.includes(user.role);

  useEffect(() => {
    if (user && HQ_ROLES.includes(user.role) && !isPreviewMode) {
      setLocation('/akademi-hq');
    }
  }, [user, setLocation, isPreviewMode]);

  if (isHQUser && !isPreviewMode) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="hq-redirect-loading">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleNavigate = (tab: string, category?: string) => {
    setActiveTab(tab);
    setSelectedCategory(category);
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (category) params.set("category", category);
    if (isPreviewMode) params.set("preview", "true");
    window.history.replaceState(null, "", `/akademi?${params.toString()}`);
  };

  const { data: homeData, isLoading: homeLoading } = useQuery<any>({
    queryKey: ["/api/v3/academy/home-data"],
    enabled: !!user,
  });

  const { data: categoryCounts } = useQuery<Record<string, number>>({
    queryKey: ["/api/v3/academy/category-counts"],
    enabled: !!user,
  });

  const liveWebinarCount = homeData?.upcomingWebinars?.filter(
    (w: any) => w.status === "live"
  )?.length || 0;

  const streak = Number(homeData?.career?.learningStreak ?? 0);
  const initials = user
    ? `${(user.firstName || user.username || "U")[0]}${(user.lastName || "")[0] || ""}`.toUpperCase()
    : "?";
  const roleLabel = ROLE_LABELS[user?.role || ""] || user?.role || "";

  return (
    <div className="min-h-full bg-background" data-testid="akademi-v3-shell">
      {isHQUser && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap" data-testid="hq-preview-banner">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-sm text-amber-600 dark:text-amber-400 truncate">
              Öğrenci ön izleme modundasınız
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/akademi-hq')}
            className="shrink-0 gap-1.5"
            data-testid="button-back-to-hq"
          >
            Yönetim Paneline Dön
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="px-4 py-3 flex items-center gap-3 flex-wrap" data-testid="v3-header">
          <Avatar className="h-9 w-9 shrink-0" data-testid="header-avatar">
            <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" data-testid="header-name">
              {user?.firstName || user?.username}{user?.lastName ? ` ${user.lastName}` : ""}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap" data-testid="header-meta">
              <span data-testid="header-role">{roleLabel}</span>
              {user?.branchId && homeData?.branchName && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span data-testid="header-branch">{homeData.branchName}</span>
                </>
              )}
            </div>
          </div>
          {streak > 0 && (
            <Badge variant="secondary" className="shrink-0 gap-1" data-testid="header-streak">
              <Flame className="h-3 w-3 text-orange-500" />
              {streak} gün
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap" data-testid="akademi-v3-tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => handleNavigate(tab.id)}
                className={`flex-1 rounded-none py-3 flex flex-col items-center gap-1 text-xs font-medium relative no-default-hover-elevate no-default-active-elevate ${
                  isActive
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground border-b-2 border-transparent"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <Icon className="h-4 w-4" />
                <span data-testid={`tab-label-${tab.id}`}>{tab.label}</span>
                {tab.id === "webinar" && liveWebinarCount > 0 && (
                  <span
                    className="absolute top-1.5 right-1/4 w-4 h-4 bg-destructive rounded-full text-[10px] flex items-center justify-center text-white font-bold"
                    data-testid="live-webinar-badge-count"
                  >
                    {liveWebinarCount}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Suspense fallback={<TabSkeleton />}>
          {activeTab === "ana" && (
            <HomeTab
              homeData={homeData}
              isLoading={homeLoading}
              onNavigate={handleNavigate}
              categoryCounts={categoryCounts}
            />
          )}
          {activeTab === "egitimler" && <TrainingTab initialCategory={selectedCategory} />}
          {activeTab === "webinar" && <WebinarTab />}
          {activeTab === "kariyer" && <CareerTab />}
        </Suspense>
      </div>
    </div>
  );
}
