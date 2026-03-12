import { useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Home,
  BookOpen,
  Video,
  Target,
  Flame,
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

export default function AkademiV3() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("ana");

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
                onClick={() => setActiveTab(tab.id)}
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
              onNavigate={setActiveTab}
              categoryCounts={categoryCounts}
            />
          )}
          {activeTab === "egitimler" && <TrainingTab />}
          {activeTab === "webinar" && <WebinarTab />}
          {activeTab === "kariyer" && <CareerTab />}
        </Suspense>
      </div>
    </div>
  );
}
