import { CardGridHub } from "@/components/card-grid-hub";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { isHQRole } from "@shared/schema";

const FACTORY_ROLES = ['fabrika', 'fabrika_mudur', 'fabrika_operator'];

// HQ roles that should see HQDashboard instead of CardGridHub
// Bu liste SADECE departman rollerini içerir - admin buraya dahil DEĞİL
// Admin CardGridHub'da mega modül kartlarını görür (tüm sistem yönetimi için)
const HQ_SPECIAL_DASHBOARD_ROLES = [
  'trainer', 'coach', 'satinalma', 'muhasebe', 'muhasebe_ik', 
  'teknik', 'destek', 'ceo', 'cgo', 'marketing', 
  'kalite_kontrol', 'fabrika_mudur', 'yatirimci_hq'
  // NOT: 'admin' buraya dahil DEĞİL - admin CardGridHub'ı görür
];

// Lazy load HQDashboard for special roles
const HQDashboard = lazy(() => import("@/pages/hq-dashboard"));

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && FACTORY_ROLES.includes(user.role)) {
      setLocation('/fabrika/dashboard');
    }
  }, [user, setLocation]);

  if (user && FACTORY_ROLES.includes(user.role)) {
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
