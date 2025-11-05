import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const hasToken = !!localStorage.getItem('dospresso_token');
  
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: hasToken, // Only fetch if token exists
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && hasToken,
  };
}
