import { useAuth } from "@/hooks/useAuth";
import { WelcomeHeader } from "./WelcomeHeader";
import { ModuleCard } from "./ModuleCard";
import { DobodyCard } from "./DobodyCard";
import { DailyBriefCard } from "@/components/DailyBriefCard";  // Sprint 48 (Aslan 13 May 2026)
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
      <div className="space-y-2 mb-4">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
      <Skeleton className="h-[70px] rounded-xl mb-3" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[90px] rounded-xl" />
        ))}
      </div>
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

  return (
    <div
      data-testid="home-screen"
      className="p-4 md:p-6 max-w-[1200px] mx-auto overflow-y-auto h-full"
    >
      {/* Greeting + KPI strip */}
      <WelcomeHeader
        firstName=""
        role={user.role}
        branchName={user.branchId ? `Şube ${user.branchId}` : null}
        alerts={homeSummary?.alerts}
      />

      {/* Mr. Dobody Banner */}
      {hasDobody && (
        <div className="mb-3">
          <DobodyCard />
        </div>
      )}

      {/* Sprint 48 (Aslan 13 May 2026): Daily AI Brief */}
      <div className="mb-3">
        <DailyBriefCard />
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3">
        {modules.map((mod) => {
          const moduleData = homeSummary?.badges?.[mod.id];
          return (
            <ModuleCard
              key={mod.id}
              config={mod}
              badges={moduleData?.badges}
              statusMessage={moduleData?.status}
            />
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-center py-3 text-muted-foreground" style={{ fontSize: 11 }}>
        {modules.length} modül · {(ROLE_LABELS[user.role] || user.role)}
      </p>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  admin:"Admin", ceo:"CEO", cgo:"CGO", coach:"Coach", trainer:"Trainer",
  muhasebe_ik:"İK-Muhasebe", muhasebe:"Muhasebe", satinalma:"Satınalma",
  supervisor:"Supervisor", supervisor_buddy:"Sup.Buddy", mudur:"Müdür",
  barista:"Barista", bar_buddy:"BarBuddy", stajyer:"Stajyer",
  fabrika_mudur:"Fabrika Md.", uretim_sefi:"Üretim Şefi",
  yatirimci_branch:"Yatırımcı", yatirimci_hq:"Yatırımcı",
};
