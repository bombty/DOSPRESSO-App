import { useQuery } from "@tanstack/react-query";

interface MyFlagsResponse {
  flags: Record<string, boolean>;
}

export function useMyModuleFlags(): {
  flags: Record<string, boolean>;
  isLoading: boolean;
  isModuleEnabled: (key: string) => boolean;
} {
  const { data, isLoading } = useQuery<MyFlagsResponse>({
    queryKey: ["/api/module-flags/my-flags"],
    queryFn: async () => {
      const res = await fetch("/api/module-flags/my-flags");
      if (!res.ok) throw new Error("Module flags fetch failed");
      return res.json();
    },
    staleTime: 60 * 1000,
    retry: 2,
  });

  return {
    flags: data?.flags ?? {},
    isLoading,
    isModuleEnabled: (key: string) => data?.flags?.[key] ?? true,
  };
}

export function useModuleEnabled(
  moduleKey: string,
  context: "ui" | "api" | "data" = "ui"
): { isEnabled: boolean; isLoading: boolean; isError: boolean } {
  const { isModuleEnabled, isLoading } = useMyModuleFlags();

  return {
    isEnabled: isModuleEnabled(moduleKey),
    isLoading,
    isError: false,
  };
}
