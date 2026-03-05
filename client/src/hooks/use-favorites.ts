import { useState, useCallback, useEffect } from "react";

export interface FavoritePage {
  path: string;
  title: string;
  icon: string;
}

const STORAGE_KEY = "dospresso_favorite_pages";
const MAX_FAVORITES = 8;

function loadFavorites(): FavoritePage[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveFavorites(favorites: FavoritePage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritePage[]>(loadFavorites);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setFavorites(loadFavorites());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const isFavorite = useCallback((path: string) => {
    return favorites.some(f => f.path === path);
  }, [favorites]);

  const toggleFavorite = useCallback((page: FavoritePage): { added: boolean; removed: boolean; reachedMax: boolean } => {
    let result = { added: false, removed: false, reachedMax: false };
    setFavorites(prev => {
      const exists = prev.some(f => f.path === page.path);
      if (exists) {
        result.removed = true;
        const next = prev.filter(f => f.path !== page.path);
        saveFavorites(next);
        return next;
      }
      if (prev.length >= MAX_FAVORITES) {
        result.reachedMax = true;
        return prev;
      }
      result.added = true;
      const next = [...prev, page];
      saveFavorites(next);
      return next;
    });
    return result;
  }, []);

  return { favorites, isFavorite, toggleFavorite, maxFavorites: MAX_FAVORITES };
}
