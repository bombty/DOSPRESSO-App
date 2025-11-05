import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const hasToken = !!localStorage.getItem('dospresso_token');
  
  const { data: user, isLoading } = useQuery({
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
