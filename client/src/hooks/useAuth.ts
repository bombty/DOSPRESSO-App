import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const isBranchOnlyContext = typeof window !== 'undefined' && 
    sessionStorage.getItem('branchAuth') && 
    window.location.pathname.startsWith('/sube/');

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 2,
    retryDelay: 500,
    enabled: !isBranchOnlyContext,
  });

  return {
    user,
    isLoading: isBranchOnlyContext ? false : isLoading, // Not loading if branch context
    isAuthenticated: !!user,
    isBranchOnlyContext,
  };
}
