import { CardGridHub } from "@/components/card-grid-hub";
import { DashboardWidgets } from "@/components/dashboard-widgets";
import { ModuleCard } from "@/components/module-card";
import { DashboardKpiStrip, type KpiItem } from "@/components/dashboard-kpi-strip";
import { DashboardAlertPills, type AlertPill } from "@/components/dashboard-alert-pills";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useMemo, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { isHQRole, isFactoryFloorRole } from "@shared/schema";
import { GraduationCap, ClipboardCheck, MessageSquare, BarChart3, Trophy } from "lucide-react";

const HQ_SPECIAL_DASHBOARD_ROLES = [
  'ceo', 'cgo', 'yatirimci_hq', 'admin',
  'trainer', 'coach', 'satinalma', 'muhasebe', 'muhasebe_ik', 
  'teknik', 'destek', 'marketing', 'kalite_kontrol',
  'fabrika_mudur', 'fabrika', 'gida_muhendisi',
];

const HQDashboard = lazy(() => import("@/pages/hq-dashboard"));

function BranchDashboard({ userRole, branchId }: { userRole: string; branchId: number }) {
  const isBranchManager = userRole === 'mudur' || userRole === 'supervisor';

  const { data: branchSummary, isLoading: kpiLoading, isError: kpiError } = useQuery<any>({
    queryKey: ['/api/branch-summary', branchId],
    queryFn: () => fetch(`/api/branch-summary/${branchId}`).then(r => r.json()),
    enabled: isBranchManager && !!branchId,
    staleTime: 3 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const kpiItems = useMemo((): KpiItem[] => {
    const kpis = branchSummary?.kpis;
    return [
      {
        value: kpis?.activeStaff?.toString() ?? '—',
        label: 'Aktif Personel',
        color: undefined,
      },
      {
        value: kpis?.checklistCompletion != null
          ? `%${Math.round(kpis.checklistCompletion)}`
          : '—',
        label: 'Checklist',
        color: kpis?.checklistCompletion != null && kpis.checklistCompletion < 70
          ? '#dc2626'
          : undefined,
      },
      {
        value: kpis?.customerAvg != null && kpis.customerAvg > 0
          ? `${Number(kpis.customerAvg).toFixed(1)}/5`
          : '—',
        label: 'Musteri Puani',
        color: kpis?.customerAvg != null && kpis.customerAvg > 0
          ? (kpis.customerAvg < 3.5 ? '#dc2626' : '#16a34a')
          : undefined,
      },
      {
        value: kpis?.warnings?.toString() ?? '0',
        label: 'Uyari',
        color: (kpis?.warnings ?? 0) > 0 ? '#dc2626' : undefined,
      },
    ];
  }, [branchSummary]);

  const alertPills = useMemo((): AlertPill[] => {
    const pills: AlertPill[] = [];
    const kpis = branchSummary?.kpis;

    if ((kpis?.warnings ?? 0) > 0) {
      pills.push({ label: `${kpis.warnings} uyari`, variant: 'red', dot: true });
    }

    if (kpis?.checklistCompletion != null && kpis.checklistCompletion < 70) {
      pills.push({ label: `Checklist %${Math.round(kpis.checklistCompletion)}`, variant: 'orange', dot: true });
    }

    if ((branchSummary?.lowStockItems?.length ?? 0) > 0) {
      pills.push({ label: `${branchSummary.lowStockItems.length} dusuk stok`, variant: 'orange', dot: true });
    }

    if (kpis?.customerAvg != null && kpis.customerAvg >= 4.0) {
      pills.push({ label: `Musteri ${Number(kpis.customerAvg).toFixed(1)}/5`, variant: 'green', dot: true });
    }

    if (pills.length === 0) {
      pills.push({ label: 'Sube normal', variant: 'green', dot: true });
    }

    return pills;
  }, [branchSummary]);

  const BRANCH_MODULES = isBranchManager ? [
    { label: 'Akademi', sublabel: 'Dersler', path: '/akademi', icon: <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />, gradient: 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900' },
    { label: 'Gorevlerim', sublabel: 'Bugunku gorevler', path: '/gorevler', icon: <ClipboardCheck className="w-8 h-8 text-green-600 dark:text-green-400" />, gradient: 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-950 dark:to-green-900' },
    { label: 'Iletisim M.', sublabel: 'Talepler', path: '/iletisim-merkezi', icon: <MessageSquare className="w-8 h-8 text-red-600 dark:text-red-400" />, gradient: 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-950 dark:to-red-900' },
    { label: 'Raporlar', sublabel: 'Sube analiz', path: '/raporlar', icon: <BarChart3 className="w-8 h-8 text-purple-600 dark:text-purple-400" />, gradient: 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-950 dark:to-purple-900' },
  ] : [
    { label: 'Akademi', sublabel: 'Dersler & Sertifika', path: '/akademi', icon: <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />, gradient: 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900' },
    { label: 'Gorevlerim', sublabel: 'Bugun', path: '/gorevler', icon: <ClipboardCheck className="w-8 h-8 text-green-600 dark:text-green-400" />, gradient: 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-950 dark:to-green-900' },
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
          ) : kpiError ? null : (
            <>
              <DashboardAlertPills pills={alertPills} />
              <DashboardKpiStrip items={kpiItems} />
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

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

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
        <div className="text-base font-bold text-foreground">Sube Atamasi Yok</div>
        <div className="text-sm text-muted-foreground max-w-sm">
          Hesabiniza henuz bir sube atanmamis. Yoneticinizle iletisime gecin.
        </div>
      </div>
    );
  }

  if (userRole && BRANCH_ROLES.includes(userRole) && (user as any)?.branchId) {
    return <BranchDashboard userRole={userRole} branchId={(user as any).branchId} />;
  }

  return (
    <div className="space-y-4">
      <DashboardWidgets />
      <CardGridHub />
    </div>
  );
}
