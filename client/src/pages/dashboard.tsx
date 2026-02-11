import { CardGridHub } from "@/components/card-grid-hub";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { isHQRole, isFactoryFloorRole } from "@shared/schema";

const HQ_SPECIAL_DASHBOARD_ROLES = [
  'ceo', 'cgo', 'yatirimci_hq',
  'trainer', 'coach', 'satinalma', 'muhasebe', 'muhasebe_ik', 
  'teknik', 'destek', 'marketing', 'kalite_kontrol',
  'fabrika_mudur', 'fabrika',
];

const HQDashboard = lazy(() => import("@/pages/hq-dashboard"));

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && isFactoryFloorRole(user.role as any)) {
      setLocation('/fabrika/dashboard');
    }
  }, [user, setLocation]);

  if (user && isFactoryFloorRole(user.role as any)) {
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

  return <CardGridHub />;
}
