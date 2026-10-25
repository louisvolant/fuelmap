import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { presetStorage } from "@/lib/presetStorage";
import type { StationSort } from "@/lib/sortStations";

interface FilterState {
  /**
   * Selected fuel. Empty means "all fuels".
   * Fuels are mutually exclusive: at most one id is selected at a time.
   */
  selectedFuelIds: string[];
  /** Hide stations that currently have a fuel in shortage. */
  hideShortages: boolean;
  /** Keep only stations with a 24/7 automated pump. */
  only24h: boolean;
  /** Required services (the station must offer all of them). */
  services: string[];
  /** Maximum distance from the user, in meters. `null` disables the radius. */
  maxDistanceMeters: number | null;
  /** Sort order used by the list view. */
  sortBy: StationSort;

  toggleFuel: (fuelId: string) => void;
  toggleService: (service: string) => void;
  setHideShortages: (value: boolean) => void;
  setOnly24h: (value: boolean) => void;
  setMaxDistance: (value: number | null) => void;
  setSortBy: (value: StationSort) => void;
  clearFuels: () => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      selectedFuelIds: [],
      hideShortages: false,
      only24h: false,
      services: [],
      maxDistanceMeters: null,
      sortBy: "price",

      toggleFuel: (fuelId) =>
        set((state) => ({
          // Selecting a fuel replaces the previous one; clicking the active
          // chip clears the filter.
          selectedFuelIds: state.selectedFuelIds[0] === fuelId ? [] : [fuelId],
        })),
      toggleService: (service) =>
        set((state) => ({
          services: state.services.includes(service)
            ? state.services.filter((item) => item !== service)
            : [...state.services, service],
        })),
      setHideShortages: (hideShortages) => set({ hideShortages }),
      setOnly24h: (only24h) => set({ only24h }),
      setMaxDistance: (maxDistanceMeters) => set({ maxDistanceMeters }),
      setSortBy: (sortBy) => set({ sortBy }),
      clearFuels: () => set({ selectedFuelIds: [] }),
      reset: () =>
        set({
          selectedFuelIds: [],
          hideShortages: false,
          only24h: false,
          services: [],
          maxDistanceMeters: null,
        }),
    }),
    {
      name: "fuelmap.filters",
      // Presets survive reloads in IndexedDB (see `presetStorage`), with the
      // previous localStorage payload migrated on the first read.
      storage: createJSONStorage(() => presetStorage),
      // Drop legacy multi-fuel selections persisted before fuels became
      // exclusive.
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<FilterState> | undefined;
        return {
          ...current,
          ...persistedState,
          selectedFuelIds: (persistedState?.selectedFuelIds ?? []).slice(0, 1),
        };
      },
    },
  ),
);

/** Number of advanced filters (excluding fuels) that are active. */
export function countActiveFilters(state: FilterState): number {
  return (
    (state.hideShortages ? 1 : 0) +
    (state.only24h ? 1 : 0) +
    (state.services.length > 0 ? 1 : 0) +
    (state.maxDistanceMeters !== null ? 1 : 0)
  );
}
