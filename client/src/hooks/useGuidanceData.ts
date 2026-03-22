import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";

const MANAGEMENT_ROLES = [
  "admin", "ceo", "cgo", "coach", "trainer", "muhasebe_ik",
  "satinalma", "kalite_kontrol", "gida_muhendisi", "fabrika_mudur",
  "mudur", "supervisor", "supervisor_buddy",
];

export interface GuidanceItem {
  id: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  deepLink: string;
}

export interface GuidanceData {
  totalGaps: number;
  criticalCount: number;
  items: GuidanceItem[];
  grouped: {
    critical: GuidanceItem[];
    high: GuidanceItem[];
    medium: GuidanceItem[];
    low: GuidanceItem[];
  };
}

export function useGuidanceData() {
  const { user } = useAuth();
  const isEligible = !!user && MANAGEMENT_ROLES.includes(user.role);

  const { data: guidance, isLoading } = useQuery<GuidanceData>({
    queryKey: ["/api/agent/guidance"],
    refetchInterval: 5 * 60 * 1000,
    enabled: isEligible,
  });

  const dismissMutation = useMutation({
    mutationFn: async (guidanceId: string) => {
      await apiRequest("POST", `/api/agent/guidance/${encodeURIComponent(guidanceId)}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/guidance"] });
    },
  });

  return {
    guidance,
    isLoading,
    isEligible,
    dismissGuidance: dismissMutation.mutate,
    isDismissing: dismissMutation.isPending,
  };
}
