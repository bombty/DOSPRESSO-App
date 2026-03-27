import { useAuth } from "@/hooks/useAuth";
import { WelcomeHeader } from "./WelcomeHeader";
import { ModuleCard } from "./ModuleCard";
import { DobodyCard } from "./DobodyCard";
import { getModulesForRole, showDobodyCard } from "./role-module-config";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

interface HomeSummaryData {
  badges: Record<string, { 
    badges: Array<{ label: string; color: "success" | "warning" | "danger" | "info" | "muted" }>; 
    status: string;
  }>;
  alerts: { criticalCount: number; pendingTasks: number; pendingApprovals: number };
}

function HomeScreenSkeleton() {
  return (
    <div className="p-3 md:p-4 space-y-3 max-w-[800px] mx-auto" data-testid="home-skeleton">
      <Skeleton className="h-10 w-48 rounded-lg" />
      <Skeleton className="h-5 w-32 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[72px] rounded-lg" />
    </div>
  );
}

export default function HomeScreen() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: branchData } = useQuery<{ name?: string }>({
    queryKey: ["/api/branches/" + user?.branchId],
    enabled: !!user?.branchId,
    staleTime: 300_000,
  });

  const { data: homeSummary } = useQuery<HomeSummaryData>({
    queryKey: ["/api/me/home-summary"],
    staleTime: 60_000,
    retry: false,
  });

  if (authLoading || !user) {
    return <HomeScreenSkeleton />;
  }

  const modules = getModulesForRole(user.role);
  const hasDobody = showDobodyCard(user.role);
  const firstName = user.firstName || user.username || "Kullanıcı";
  const branchName = branchData?.name || null;

  const fullCards = modules.filter((m) => !m.halfWidth);
  const halfCards = modules.filter((m) => m.halfWidth);

  return (
    <div
      className="p-3 md:p-4 max-w-[800px] mx-auto overflow-y-auto h-full"
      data-testid="home-screen"
    >
      <WelcomeHeader
        firstName={firstName}
        role={user.role || ""}
        branchName={branchName}
        alerts={homeSummary?.alerts}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2" data-testid="module-grid">
        {fullCards.map((mod) => (
          <ModuleCard
            key={mod.id}
            config={mod}
            badges={homeSummary?.badges?.[mod.id]?.badges}
            statusMessage={homeSummary?.badges?.[mod.id]?.status}
          />
        ))}
      </div>

      {hasDobody && (
        <div className="mb-2">
          <DobodyCard />
        </div>
      )}

      {halfCards.length > 0 && (
        <div
          className={`grid gap-2 ${
            halfCards.length === 1
              ? "grid-cols-1"
              : halfCards.length === 2
                ? "grid-cols-2"
                : "grid-cols-3"
          }`}
        >
          {halfCards.map((mod) => (
            <ModuleCard
              key={mod.id}
              config={mod}
              badges={homeSummary?.badges?.[mod.id]?.badges}
              statusMessage={homeSummary?.badges?.[mod.id]?.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
