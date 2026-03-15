import { CardGridHub } from "@/components/card-grid-hub";
import { DashboardWidgets } from "@/components/dashboard-widgets";
import { ModuleCard } from "@/components/module-card";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { isHQRole, isFactoryFloorRole } from "@shared/schema";
import { GraduationCap, ClipboardCheck, MessageSquare, BarChart3, Trophy } from "lucide-react";

const HQ_SPECIAL_DASHBOARD_ROLES = [
  'ceo', 'cgo', 'yatirimci_hq', 'admin',
  'trainer', 'coach', 'satinalma', 'muhasebe', 'muhasebe_ik', 
  'teknik', 'destek', 'marketing', 'kalite_kontrol',
  'fabrika_mudur', 'fabrika', 'gida_muhendisi',
];

const HQDashboard = lazy(() => import("@/pages/hq-dashboard"));

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
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Yükleniyor...</div>}>
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

  const isBranchManager = userRole === 'mudur' || userRole === 'supervisor';

  const BRANCH_MODULES = isBranchManager ? [
    { label: 'Akademi', sublabel: 'Dersler', path: '/akademi', icon: <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />, gradient: 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900' },
    { label: 'Görevlerim', sublabel: 'Bugünkü görevler', path: '/gorevler', icon: <ClipboardCheck className="w-8 h-8 text-green-600 dark:text-green-400" />, gradient: 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-950 dark:to-green-900' },
    { label: 'İletişim M.', sublabel: 'Talepler', path: '/iletisim-merkezi', icon: <MessageSquare className="w-8 h-8 text-red-600 dark:text-red-400" />, gradient: 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-950 dark:to-red-900' },
    { label: 'Raporlar', sublabel: 'Şube analiz', path: '/raporlar', icon: <BarChart3 className="w-8 h-8 text-purple-600 dark:text-purple-400" />, gradient: 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-950 dark:to-purple-900' },
  ] : [
    { label: 'Akademi', sublabel: 'Dersler & Sertifika', path: '/akademi', icon: <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />, gradient: 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900' },
    { label: 'Görevlerim', sublabel: 'Bugün', path: '/gorevler', icon: <ClipboardCheck className="w-8 h-8 text-green-600 dark:text-green-400" />, gradient: 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-950 dark:to-green-900' },
    { label: 'Sıralama', sublabel: 'Lider tablosu', path: '/akademi-leaderboard', icon: <Trophy className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />, gradient: 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-950 dark:to-yellow-900' },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3 mb-2" data-testid="branch-ci-section">
        <div>
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
            Hızlı Erişim
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
