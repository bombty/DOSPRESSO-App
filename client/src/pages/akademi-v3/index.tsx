import { useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home,
  BookOpen,
  Video,
  Target,
} from "lucide-react";

const HomeTab = lazy(() => import("./HomeTab"));
const TrainingTab = lazy(() => import("./TrainingTab"));
const WebinarTab = lazy(() => import("./WebinarTab"));
const CareerTab = lazy(() => import("./CareerTab"));

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

  const liveWebinarCount = homeData?.upcomingWebinars?.filter(
    (w: any) => w.status === "live"
  )?.length || 0;

  return (
    <div className="min-h-full bg-background" data-testid="akademi-v3-shell">
      <div className="sticky top-0 z-50 bg-background border-b">
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
