import { useAuth } from "@/hooks/useAuth";

export function useDashboardMode() {
  const { user } = useAuth();

  return {
    mode: "mission-control" as const,
    isMissionControl: true,
    setMode: (_newMode: "classic" | "mission-control") => {},
    toggleMode: () => {},
    isLoading: false,
    isSaving: false,
  };
}
