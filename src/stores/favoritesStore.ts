import { create } from "zustand";
import type { CountryCode } from "@/countries/types";
import { addFavorite, getFavorites, removeFavorite } from "@/lib/db/indexedDb";

interface FavoritesState {
  /** Ids of the locally saved stations. */
  favoriteIds: string[];
  /** Whether favorites have been loaded from IndexedDB at least once. */
  loaded: boolean;
  /** Load favorites from IndexedDB. Safe to call multiple times. */
  load: () => Promise<void>;
  /** Add or remove a station from favorites (persisted in IndexedDB). */
  toggle: (id: string, country: CountryCode) => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoriteIds: [],
  loaded: false,

  async load() {
    const rows = await getFavorites();
    set({ favoriteIds: rows.map((row) => row.id), loaded: true });
  },

  async toggle(id, country) {
    const { favoriteIds } = get();
    if (favoriteIds.includes(id)) {
      await removeFavorite(id);
      set({ favoriteIds: favoriteIds.filter((favoriteId) => favoriteId !== id) });
    } else {
      await addFavorite(id, country);
      set({ favoriteIds: [...favoriteIds, id] });
    }
  },
}));
