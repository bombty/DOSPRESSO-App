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

  const toggleFavorite = useCallback((page: FavoritePage) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.path === page.path);
      let next: FavoritePage[];
      if (exists) {
        next = prev.filter(f => f.path !== page.path);
      } else {
        if (prev.length >= MAX_FAVORITES) {
          next = [...prev.slice(0, MAX_FAVORITES - 1), page];
        } else {
          next = [...prev, page];
        }
      }
      saveFavorites(next);
      return next;
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
