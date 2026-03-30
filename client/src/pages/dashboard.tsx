import { CardGridHub } from "@/components/card-grid-hub";
import { DashboardWidgets } from "@/components/dashboard-widgets";
import { ModuleCard } from "@/components/module-card";
import { UnifiedKPI, type KPIItem } from "@/components/shared/UnifiedKPI";
import { DashboardAlertPills, type AlertPill } from "@/components/dashboard-alert-pills";
import { DashboardModeToggle } from "@/components/mission-control/DashboardModeToggle";
import { DashboardRouter } from "@/components/mission-control/DashboardRouter";
import { DobodyPanel, DobodyMobileCard } from "@/components/mission-control/DobodyPanel";
import { useDashboardMode } from "@/hooks/useDashboardMode";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useMemo, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { isHQRole, isFactoryFloorRole } from "@shared/schema";
import { GraduationCap, ClipboardCheck, MessageSquare, BarChart3, Trophy } from "lucide-react";

interface BranchSummaryKpis {
  activeStaff: number;
  totalStaff: number;
  checklistCompletion: number;
  customerAvg: number;
  feedbackCount: number;
  warnings: number;
}

interface BranchSummaryResponse {
  branch: { id: number; name: string };
  kpis: BranchSummaryKpis;
  teamStatus: { id: string; name: string; role: string; checklistStatus: string }[];
  lowStockItems: { id: number; name: string; currentStock: number; minStock: number }[];
  suggestions: string[];
}

const HQ_SPECIAL_DASHBOARD_ROLES = [
  'ceo', 'cgo', 'yatirimci_hq', 'admin',
  'trainer', 'coach', 'satinalma', 'muhasebe', 'muhasebe_ik', 
  'teknik', 'destek', 'marketing', 'kalite_kontrol',
  'fabrika_mudur', 'fabrika', 'gida_muhendisi',
];

const HQDashboard = lazy(() => import("@/pages/hq-dashboard"));

function BranchDashboard({ userRole, branchId }: { userRole: string; branchId: number }) {
  const isBranchManager = userRole === 'mudur' || userRole === 'supervisor';

  const { data: branchSummary, isLoading: kpiLoading, isError: kpiError } = useQuery<BranchSummaryResponse>({
    queryKey: ['/api/branch-summary', branchId],
    queryFn: async () => {
      const r = await fetch(`/api/branch-summary/${branchId}`);
      if (!r.ok) throw new Error(`branch-summary ${r.status}`);
      return r.json();
    },
    enabled: isBranchManager && !!branchId,
    staleTime: 3 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const kpiItems = useMemo((): KPIItem[] => {
    const kpis = branchSummary?.kpis;
    return [
      {
        value: kpis?.activeStaff?.toString() ?? '—',
        label: 'Aktif Personel',
        color: 'default' as const,
      },
      {
        value: kpis?.checklistCompletion != null
          ? `%${Math.round(kpis.checklistCompletion)}`
          : '—',
        label: 'Checklist',
        color: kpis?.checklistCompletion != null && kpis.checklistCompletion < 70
          ? 'danger' as const
          : 'default' as const,
      },
      {
        value: kpis?.customerAvg != null && kpis.customerAvg > 0
          ? `${Number(kpis.customerAvg).toFixed(1)}/5`
          : '—',
        label: 'Müşteri Puanı',
        color: kpis?.customerAvg != null && kpis.customerAvg > 0
          ? (kpis.customerAvg < 3.5 ? 'danger' as const : 'success' as const)
          : 'default' as const,
      },
      {
        value: kpis?.warnings != null ? kpis.warnings.toString() : '—',
        label: 'Uyari',
        color: kpis?.warnings != null && kpis.warnings > 0 ? 'danger' as const : 'default' as const,
      },
    ];
  }, [branchSummary]);

  const alertPills = useMemo((): AlertPill[] => {
    const pills: AlertPill[] = [];
    const kpis = branchSummary?.kpis;

    if ((kpis?.warnings ?? 0) > 0) {
      pills.push({ label: `${kpis?.warnings} uyari`, variant: 'red', dot: true });
    }

    if (kpis?.checklistCompletion != null && kpis.checklistCompletion < 70) {
      pills.push({ label: `Checklist %${Math.round(kpis.checklistCompletion)}`, variant: 'orange', dot: true });
    }

    if ((branchSummary?.lowStockItems?.length ?? 0) > 0) {
      pills.push({ label: `${branchSummary!.lowStockItems.length} dusuk stok`, variant: 'orange', dot: true });
    }

    if (kpis?.customerAvg != null && kpis.customerAvg >= 4.0) {
      pills.push({ label: `Müşteri ${Number(kpis.customerAvg).toFixed(1)}/5`, variant: 'green', dot: true });
    }

    if (pills.length === 0) {
      pills.push({ label: 'Şube normal', variant: 'green', dot: true });
    }

    return pills;
  }, [branchSummary]);

  const BRANCH_MODULES = isBranchManager ? [
    { label: 'Akademi', sublabel: 'Dersler', path: '/akademi', icon: <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />, gradient: 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900' },
    { label: 'Görevlerim', sublabel: 'Bugünkü görevler', path: '/gorevler', icon: <ClipboardCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />, gradient: 'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-950 dark:to-emerald-900' },
    { label: 'Iletisim M.', sublabel: 'Talepler', path: '/hq-destek', icon: <MessageSquare className="w-8 h-8 text-red-600 dark:text-red-400" />, gradient: 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-950 dark:to-red-900' },
    { label: 'Raporlar', sublabel: 'Şube analiz', path: '/raporlar', icon: <BarChart3 className="w-8 h-8 text-purple-600 dark:text-purple-400" />, gradient: 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-950 dark:to-purple-900' },
  ] : [
    { label: 'Akademi', sublabel: 'Dersler & Sertifika', path: '/akademi', icon: <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />, gradient: 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900' },
    { label: 'Görevlerim', sublabel: 'Bugün', path: '/gorevler', icon: <ClipboardCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />, gradient: 'bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-950 dark:to-emerald-900' },
    { label: 'Siralama', sublabel: 'Lider tablosu', path: '/akademi-leaderboard', icon: <Trophy className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />, gradient: 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-950 dark:to-yellow-900' },
  ];

  return (
    <div className="space-y-4">
      {isBranchManager && (
        <div className="space-y-2 mb-1" data-testid="branch-kpi-section">
          {kpiLoading ? (
            <div className="grid grid-cols-4 gap-1.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" data-testid={`kpi-skeleton-${i}`} />
              ))}
            </div>
          ) : kpiError ? (
            <DashboardAlertPills pills={[{ label: 'Veri yuklenemedi', variant: 'orange', dot: true }]} />
          ) : (
            <>
              <DashboardAlertPills pills={alertPills} />
              <UnifiedKPI items={kpiItems} variant="compact" desktopColumns={4} />
            </>
          )}
        </div>
      )}

      <div className="space-y-3 mb-2" data-testid="branch-ci-section">
        <div>
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
            Hizli Erisim
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {BRANCH_MODULES.map(m => (
              <ModuleCard key={m.path} {...m} />
            ))}
          </div>
        </div>
      </div>
      <DashboardWidgets />
      <CardGridHub />
    </div>
  );
}

function MissionControlWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full" data-testid="mission-control-wrapper">
      <div className="hidden md:flex">
        <DobodyPanel />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="md:hidden">
          <DobodyMobileCard />
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { isMissionControl, isLoading: modeLoading } = useDashboardMode();

  useEffect(() => {
    if (user && isFactoryFloorRole(user.role as any)) {
      setLocation('/fabrika/dashboard');
    }
    if (user?.role === 'ceo' || user?.role === 'cgo' || user?.role === 'admin') {
      setLocation('/hq-ozet');
    }
  }, [user, setLocation]);

  if (user && (isFactoryFloorRole(user.role as any) || user.role === 'ceo' || user.role === 'cgo' || user.role === 'admin')) {
    return null;
  }

  if (modeLoading) {
    return <div className="flex items-center justify-center h-screen">Yukleniyor...</div>;
  }

  if (isMissionControl) {
    return (
      <MissionControlWrapper>
        <DashboardRouter />
      </MissionControlWrapper>
    );
  }

  const userRole = user?.role;
  const hasSpecialDashboard = userRole && HQ_SPECIAL_DASHBOARD_ROLES.includes(userRole) && isHQRole(userRole as any);

  if (hasSpecialDashboard) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Yukleniyor...</div>}>
        <HQDashboard />
      </Suspense>
    );
  }

  const BRANCH_ROLES = ['mudur', 'supervisor', 'supervisor_buddy', 'barista', 'bar_buddy', 'stajyer', 'yatirimci_branch'];
  if (userRole && BRANCH_ROLES.includes(userRole) && !(user as any)?.branchId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center px-6" data-testid="no-branch-warning">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="text-base font-bold text-foreground">Şube Atamasi Yok</div>
        <div className="text-sm text-muted-foreground max-w-sm">
          Hesabiniza henuz bir sube atanmamis. Yoneticinizle iletisime gecin.
        </div>
      </div>
    );
  }

  if (userRole && BRANCH_ROLES.includes(userRole) && (user as any)?.branchId) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end px-4 pt-2">
          <DashboardModeToggle />
        </div>
        <BranchDashboard userRole={userRole} branchId={(user as any).branchId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end px-4 pt-2">
        <DashboardModeToggle />
      </div>
      <DashboardWidgets />
      <CardGridHub />
    </div>
  );
}
