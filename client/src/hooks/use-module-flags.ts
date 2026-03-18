import { useQuery } from "@tanstack/react-query";

interface ModuleCheckResponse {
  enabled: boolean;
}

export function useModuleEnabled(
  moduleKey: string,
  context: "ui" | "api" | "data" = "ui"
): { isEnabled: boolean; isLoading: boolean; isError: boolean } {
  const { data, isLoading, isError } = useQuery<ModuleCheckResponse>({
    queryKey: ["/api/module-flags/check", moduleKey, context],
    queryFn: async () => {
      const res = await fetch(
        `/api/module-flags/check?moduleKey=${encodeURIComponent(moduleKey)}&context=${encodeURIComponent(context)}`
      );
      if (!res.ok) {
        throw new Error("Module flag check failed");
      }
      return res.json();
    },
    staleTime: 60 * 1000,
    retry: 2,
    enabled: !!moduleKey,
  });

  return {
    isEnabled: isError ? true : (data?.enabled ?? true),
    isLoading,
    isError,
  };
}
