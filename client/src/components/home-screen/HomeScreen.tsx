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
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-8 w-40 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[100px] md:h-[120px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[80px] rounded-xl mt-3" />
    </div>
  );
}

export default function HomeScreen() {
  const { user, isLoading: authLoading } = useAuth();

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

  const fullCards = modules.filter((m) => !m.halfWidth);
  const halfCards = modules.filter((m) => m.halfWidth);

  return (
    <div
      data-testid="home-screen"
      className="p-4 md:p-6 max-w-[1200px] mx-auto overflow-y-auto h-full"
    >
      {/* Alert pills only — name is in header */}
      <WelcomeHeader
        firstName=""
        role={user.role || ""}
        alerts={homeSummary?.alerts}
      />

      {/* Main module grid — 2 col mobile, 3 col desktop */}
      <div
        data-testid="module-grid"
        className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-[14px] mb-3 md:mb-[14px]"
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

      {/* Mr. Dobody card */}
      {hasDobody && (
        <div className="mb-3 md:mb-[14px]">
          <DobodyCard />
        </div>
      )}

      {/* Half-width utility cards */}
      {halfCards.length > 0 && (
        <div className={`grid gap-3 md:gap-[14px] ${
          halfCards.length === 1 ? "grid-cols-1" :
          halfCards.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"
        }`}>
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

      {/* Footer */}
      <p className="text-center text-[11px] py-3 opacity-50"
        style={{ color: "var(--ds-text-secondary)" }}>
        {user.role === "admin" ? "Admin: 12 modül · 31 alt sayfa · Tam erişim" :
         `${modules.length} modül · ${(user.role || "").toUpperCase()}`}
      </p>
    </div>
  );
}
