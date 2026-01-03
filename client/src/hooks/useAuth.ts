import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  // Check if we're in a branch-only login context (via sessionStorage)
  // This allows kiosk/branch pages to work without user auth
  const isBranchOnlyContext = typeof window !== 'undefined' && 
    sessionStorage.getItem('branchAuth') && 
    window.location.pathname.startsWith('/sube/');

  // Session-based auth via cookies - skip query for branch-only contexts
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !isBranchOnlyContext, // Don't fetch if in branch-only context
  });

  return {
    user,
    isLoading: isBranchOnlyContext ? false : isLoading, // Not loading if branch context
    isAuthenticated: !!user,
    isBranchOnlyContext,
  };
}
