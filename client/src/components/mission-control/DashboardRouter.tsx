import { lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const MissionControlHQ = lazy(() => import("./MissionControlHQ"));
const MissionControlSupervisor = lazy(() => import("./MissionControlSupervisor"));
const MissionControlStajyer = lazy(() => import("./MissionControlStajyer"));

const HQ_ROLES = [
  "ceo", "cgo", "admin", "coach", "trainer",
  "muhasebe_ik", "muhasebe", "satinalma", "kalite_kontrol",
  "gida_muhendisi", "teknik", "destek", "marketing",
  "yatirimci_hq",
];

const SUPERVISOR_ROLES = ["supervisor", "supervisor_buddy", "mudur"];
const STAFF_ROLES = ["stajyer", "bar_buddy", "barista", "yatirimci_branch"];
const FACTORY_ROLES = [
  "fabrika_mudur", "fabrika_sorumlu", "fabrika_personel",
  "fabrika_pisman", "fabrika_depo", "fabrika_kalite",
];

function MCLoading() {
  return (
    <div className="p-4 space-y-4" data-testid="mc-loading">
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}

export function DashboardRouter() {
  const { user } = useAuth();
  const role = user?.role || "";

  if (HQ_ROLES.includes(role)) {
    return (
      <Suspense fallback={<MCLoading />}>
        <MissionControlHQ />
      </Suspense>
    );
  }

  if (SUPERVISOR_ROLES.includes(role)) {
    return (
      <Suspense fallback={<MCLoading />}>
        <MissionControlSupervisor />
      </Suspense>
    );
  }

  if (STAFF_ROLES.includes(role)) {
    return (
      <Suspense fallback={<MCLoading />}>
        <MissionControlStajyer />
      </Suspense>
    );
  }

  if (FACTORY_ROLES.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4" data-testid="mc-factory-placeholder">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-2xl">🏭</span>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold">Fabrika Mission Control</h2>
          <p className="text-sm text-muted-foreground">Yakında aktif olacak.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<MCLoading />}>
      <MissionControlHQ />
    </Suspense>
  );
}
