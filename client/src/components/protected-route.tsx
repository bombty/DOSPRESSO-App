import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

type RoleGroup = 'admin' | 'hq' | 'sube' | 'fabrika';

const ROLE_MAPPING: Record<string, RoleGroup[]> = {
  admin: ['admin'],
  ceo: ['admin', 'hq'],
  cgo: ['admin', 'hq'],
  muhasebe: ['hq'],
  muhasebe_ik: ['hq'],
  teknik: ['hq'],
  destek: ['hq'],
  coach: ['hq'],
  satinalma: ['hq'],
  marketing: ['hq'],
  trainer: ['hq'],
  kalite_kontrol: ['hq'],
  yatirimci_hq: ['hq'],
  fabrika: ['fabrika', 'hq'],
  fabrika_mudur: ['fabrika', 'hq'],
  fabrika_operator: ['fabrika'],
  supervisor: ['sube'],
  supervisor_buddy: ['sube'],
  barista: ['sube'],
  bar_buddy: ['sube'],
  stajyer: ['sube'],
  yatirimci_branch: ['sube'],
};

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  allowedGroups?: RoleGroup[];
  requireAuth?: boolean;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  allowedGroups,
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, isBranchOnlyContext } = useAuth();
  
  if (isBranchOnlyContext) {
    return <>{children}</>;
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-auth">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (requireAuth && !isAuthenticated) {
    return <Redirect to="/login" />;
  }
  
  const userRole = user?.role || '';
  const userGroups = ROLE_MAPPING[userRole] || [];
  
  const hasRoleAccess = !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(userRole);
  const hasGroupAccess = !allowedGroups || allowedGroups.length === 0 || allowedGroups.some(g => userGroups.includes(g));
  
  if (userRole === 'admin') {
    return <>{children}</>;
  }
  
  if (allowedRoles && !hasRoleAccess) {
    return <AccessDenied />;
  }
  
  if (allowedGroups && !hasGroupAccess) {
    return <AccessDenied />;
  }
  
  return <>{children}</>;
}

function AccessDenied() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4" data-testid="access-denied">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle>Erişim Engellendi</CardTitle>
          <CardDescription>
            Bu sayfaya erişim yetkiniz bulunmamaktadır.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/">
            <Button data-testid="button-go-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ana Sayfaya Dön
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export function useHasAccess(allowedRoles?: string[], allowedGroups?: RoleGroup[]) {
  const { user } = useAuth();
  const userRole = user?.role || '';
  const userGroups = ROLE_MAPPING[userRole] || [];
  
  if (userRole === 'admin') return true;
  
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(userRole)) return false;
  }
  
  if (allowedGroups && allowedGroups.length > 0) {
    if (!allowedGroups.some(g => userGroups.includes(g))) return false;
  }
  
  return true;
}
