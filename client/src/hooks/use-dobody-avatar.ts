import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

interface DobodyAvatarData {
  id: number;
  imageUrl: string;
  category: string;
  label: string | null;
}

export function useDobodyAvatar(category?: string): string | null {
  const { data: avatars } = useQuery<DobodyAvatarData[]>({
    queryKey: ["/api/dobody/avatars"],
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const avatarUrl = useMemo(() => {
    if (!avatars || avatars.length === 0) return null;

    let filtered = avatars;
    if (category && category !== "all") {
      filtered = avatars.filter((a) => a.category === category);
      if (filtered.length === 0) filtered = avatars;
    }

    const randomIndex = Math.floor(Math.random() * filtered.length);
    return filtered[randomIndex].imageUrl;
  }, [avatars, category]);

  return avatarUrl;
}
