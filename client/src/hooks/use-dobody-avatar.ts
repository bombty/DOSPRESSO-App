import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

interface DobodyAvatarData {
  id: number;
  imageUrl: string;
  category: string;
  label: string | null;
}

const sessionAvatarCache = new Map<string, string>();

export function useDobodyAvatar(category?: string): string | null {
  const { user } = useAuth();

  const { data: avatars } = useQuery<DobodyAvatarData[]>({
    queryKey: ["/api/dobody/avatars"],
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const avatarUrl = useMemo(() => {
    if (!avatars || avatars.length === 0) return null;

    const cacheKey = category || "__default__";
    const cached = sessionAvatarCache.get(cacheKey);
    if (cached && avatars.some((a) => a.imageUrl === cached)) {
      return cached;
    }

    let filtered = avatars;
    if (category && category !== "all") {
      filtered = avatars.filter((a) => a.category === category);
      if (filtered.length === 0) filtered = avatars;
    }

    const randomIndex = Math.floor(Math.random() * filtered.length);
    const selected = filtered[randomIndex].imageUrl;
    sessionAvatarCache.set(cacheKey, selected);
    return selected;
  }, [avatars, category]);

  return avatarUrl;
}
