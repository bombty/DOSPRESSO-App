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
    <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }} data-testid="home-skeleton">
      <Skeleton className="h-12 w-64 rounded-lg mb-2" />
      <Skeleton className="h-6 w-48 rounded mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[100px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[80px] rounded-xl mt-4" />
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
      data-testid="home-screen"
      style={{
        padding: "20px 24px",
        maxWidth: 1200,
        margin: "0 auto",
        overflowY: "auto",
        height: "100%",
      }}
    >
      <WelcomeHeader
        firstName={firstName}
        role={user.role || ""}
        branchName={branchName}
        alerts={homeSummary?.alerts}
      />

      {/* Main module grid */}
      <div
        data-testid="module-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        {fullCards.map((mod) => (
          <ModuleCard
            key={mod.id}
            config={mod}
            badges={homeSummary?.badges?.[mod.id]?.badges}
            statusMessage={homeSummary?.badges?.[mod.id]?.status}
          />
        ))}
      </div>

      {/* Mr. Dobody card (full width) */}
      {hasDobody && (
        <div style={{ marginBottom: "12px" }}>
          <DobodyCard />
        </div>
      )}

      {/* Half-width utility cards */}
      {halfCards.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(halfCards.length, 3)}, 1fr)`,
            gap: "12px",
          }}
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
