import { CardGridHub } from "@/components/card-grid-hub";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { isHQRole } from "@shared/schema";

// Sadece fabrika ZEMİN rolleri (operatör vb.) - fabrika_mudur ve fabrika HQ rolleridir
const FACTORY_FLOOR_ROLES = ['fabrika_operator', 'fabrika_sorumlu', 'fabrika_personel'];

// HQ rolleri - HQ Dashboard (departman bazlı görünüm)
// Admin buraya dahil DEĞİL - admin CardGridHub'ı görür
const HQ_SPECIAL_DASHBOARD_ROLES = [
  'ceo', 'cgo', 'yatirimci_hq',
  'trainer', 'coach', 'satinalma', 'muhasebe', 'muhasebe_ik', 
  'teknik', 'destek', 'marketing', 'kalite_kontrol',
  'fabrika_mudur', 'fabrika',
];

// Lazy load HQDashboard for special roles
const HQDashboard = lazy(() => import("@/pages/hq-dashboard"));

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && FACTORY_FLOOR_ROLES.includes(user.role)) {
      setLocation('/fabrika/dashboard');
    }
  }, [user, setLocation]);

  if (user && FACTORY_FLOOR_ROLES.includes(user.role)) {
    return null;
  }

  // Check if user has a special HQ dashboard role
  const userRole = user?.role;
  const hasSpecialDashboard = userRole && HQ_SPECIAL_DASHBOARD_ROLES.includes(userRole) && isHQRole(userRole as any);

  // If user has a special dashboard role, show HQDashboard which handles role-based views
  if (hasSpecialDashboard) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Yükleniyor...</div>}>
        <HQDashboard />
      </Suspense>
    );
  }

  return <CardGridHub />;
}
