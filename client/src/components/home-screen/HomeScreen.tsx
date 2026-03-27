import { useAuth } from "@/hooks/useAuth";
import { WelcomeHeader } from "./WelcomeHeader";
import { ModuleCard } from "./ModuleCard";
import { DobodyCard } from "./DobodyCard";
import { getModulesForRole, showDobodyCard } from "./role-module-config";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

function HomeScreenSkeleton() {
  return (
    <div className="p-4 space-y-3 max-w-[800px] mx-auto" data-testid="home-skeleton">
      <Skeleton className="h-12 w-48 rounded-lg" />
      <Skeleton className="h-6 w-32 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-lg" />
    </div>
  );
}

export default function HomeScreen() {
  const { user, isLoading: authLoading } = useAuth();

  // Fetch branch name for display
  const { data: branchData } = useQuery<{ name?: string }>({
    queryKey: ["/api/branches/" + user?.branchId],
    enabled: !!user?.branchId,
    staleTime: 300_000,
  });

  if (authLoading || !user) {
    return <HomeScreenSkeleton />;
  }

  const modules = getModulesForRole(user.role);
  const hasDobody = showDobodyCard(user.role);
  const firstName = user.firstName || user.username || "Kullanıcı";
  const branchName = branchData?.name || null;

  // Separate full-width and half-width cards
  const fullCards = modules.filter((m) => !m.halfWidth);
  const halfCards = modules.filter((m) => m.halfWidth);

  return (
    <div
      className="p-3 md:p-4 max-w-[800px] mx-auto overflow-y-auto h-full"
      data-testid="home-screen"
    >
      {/* Welcome */}
      <WelcomeHeader
        firstName={firstName}
        role={user.role || ""}
        branchName={branchName}
      />

      {/* Main module grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2" data-testid="module-grid">
        {fullCards.map((mod) => (
          <ModuleCard key={mod.id} config={mod} />
        ))}
      </div>

      {/* Mr. Dobody card (full width) */}
      {hasDobody && <div className="mb-2"><DobodyCard /></div>}

      {/* Half-width utility cards */}
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
            <ModuleCard key={mod.id} config={mod} />
          ))}
        </div>
      )}
    </div>
  );
}
