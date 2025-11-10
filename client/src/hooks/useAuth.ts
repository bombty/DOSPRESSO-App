import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { User } from "@shared/schema";

export function useAuth() {
  const [hasToken, setHasToken] = useState(() => !!localStorage.getItem('dospresso_token'));
  
  // Listen for storage changes and token updates
  useEffect(() => {
    const checkToken = () => {
      setHasToken(!!localStorage.getItem('dospresso_token'));
    };
    
    // Check immediately
    checkToken();
    
    // Listen for storage events (cross-tab)
    window.addEventListener('storage', checkToken);
    
    // Custom event for same-tab updates
    window.addEventListener('tokenChanged', checkToken);
    
    return () => {
      window.removeEventListener('storage', checkToken);
      window.removeEventListener('tokenChanged', checkToken);
    };
  }, []);
  
  // Always try to fetch user - supports both session-based (OIDC) and token-based auth
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    // Enable query always to support session auth (OIDC cookies) in addition to JWT tokens
  });

  return {
    user,
    isLoading,
    // User is authenticated if user data exists (either from session or token)
    isAuthenticated: !!user,
  };
}
