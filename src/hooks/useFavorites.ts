import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "lviv-transit-favorites";

export interface FavoriteEntry {
  id: string;
  routeShortName: string;
  routeId: string;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFavorites(JSON.parse(raw) as FavoriteEntry[]);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: FavoriteEntry[]) => {
    setFavorites(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(
    (entry: FavoriteEntry) => {
      setFavorites((prev) => {
        const exists = prev.some((f) => f.id === entry.id);
        const next = exists
          ? prev.filter((f) => f.id !== entry.id)
          : [...prev, entry];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    []
  );

  const isFavorite = useCallback(
    (id: string) => favorites.some((f) => f.id === id),
    [favorites]
  );

  const favoriteRouteIds = new Set(favorites.map((f) => f.routeId));

  return { favorites, toggle, isFavorite, favoriteRouteIds };
}
