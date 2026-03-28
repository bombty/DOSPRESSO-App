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
    <div style={{ padding: "var(--ds-page-padding-y) var(--ds-page-padding-x)", maxWidth: "var(--ds-max-width)", margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-8 w-40 rounded-lg" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[110px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[90px] rounded-xl mt-3" />
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
      style={{
        padding: `var(--ds-page-padding-y) var(--ds-page-padding-x)`,
        maxWidth: "var(--ds-max-width)",
        margin: "0 auto",
        overflowY: "auto",
        height: "100%",
      }}
    >
      {/* Alert pills only — name is in header, no repetition */}
      <WelcomeHeader
        firstName=""
        role={user.role || ""}
        alerts={homeSummary?.alerts}
      />

      {/* Main module grid — responsive 3 columns */}
      <div
        data-testid="module-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "var(--ds-gap-md)",
          marginBottom: "var(--ds-gap-md)",
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

      {/* Mr. Dobody card */}
      {hasDobody && (
        <div style={{ marginBottom: "var(--ds-gap-md)" }}>
          <DobodyCard />
        </div>
      )}

      {/* Half-width utility cards */}
      {halfCards.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(halfCards.length, 3)}, 1fr)`,
          gap: "var(--ds-gap-md)",
        }}>
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

      {/* Footer note */}
      <p style={{
        textAlign: "center",
        fontSize: "var(--ds-font-small)",
        color: "var(--ds-text-secondary)",
        padding: "12px 0 4px",
        opacity: 0.5,
      }}>
        {user.role === "admin" ? "Admin: 12 modül · 31 alt sayfa · Tam erişim" :
         `${modules.length} modül · ${user.role?.toUpperCase()}`}
      </p>
    </div>
  );
}
