import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface DashboardPreferences {
  mode: "classic" | "mission-control";
  layout?: any;
}

export function useDashboardMode() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<DashboardPreferences>({
    queryKey: ["/api/me/dashboard-preferences"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (prefs: Partial<DashboardPreferences>) => {
      const res = await apiRequest("PATCH", "/api/me/dashboard-preferences", prefs);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/dashboard-preferences"] });
    },
  });

  const mode = data?.mode || "classic";
  const isMissionControl = mode === "mission-control";

  const setMode = (newMode: "classic" | "mission-control") => {
    mutation.mutate({ mode: newMode });
  };

  const toggleMode = () => {
    setMode(isMissionControl ? "classic" : "mission-control");
  };

  return {
    mode,
    isMissionControl,
    setMode,
    toggleMode,
    isLoading,
    isSaving: mutation.isPending,
  };
}
