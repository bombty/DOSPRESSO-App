import { lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const MissionControlHQ = lazy(() => import("./MissionControlHQ"));
const MissionControlCoach = lazy(() => import("./MissionControlCoach"));
const MissionControlMuhasebe = lazy(() => import("./MissionControlMuhasebe"));
const MissionControlSupervisor = lazy(() => import("./MissionControlSupervisor"));
const MissionControlStajyer = lazy(() => import("./MissionControlStajyer"));
const MissionControlFabrika = lazy(() => import("./MissionControlFabrika"));

const EXEC_ROLES = ["ceo", "cgo", "admin"];
const COACH_ROLES = ["coach", "trainer"];
const FINANCE_ROLES = ["muhasebe_ik", "muhasebe"];
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

  if (EXEC_ROLES.includes(role)) {
    return (
      <Suspense fallback={<MCLoading />}>
        <MissionControlHQ />
      </Suspense>
    );
  }

  if (COACH_ROLES.includes(role)) {
    return (
      <Suspense fallback={<MCLoading />}>
        <MissionControlCoach />
      </Suspense>
    );
  }

  if (FINANCE_ROLES.includes(role)) {
    return (
      <Suspense fallback={<MCLoading />}>
        <MissionControlMuhasebe />
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
      <Suspense fallback={<MCLoading />}>
        <MissionControlFabrika />
      </Suspense>
    );
  }

  if (HQ_ROLES.includes(role)) {
    return (
      <Suspense fallback={<MCLoading />}>
        <MissionControlHQ />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<MCLoading />}>
      <MissionControlHQ />
    </Suspense>
  );
}
