import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FilterState {
  /**
   * Selected fuels. Empty means "all fuels".
   * One entry = single-fuel filter; several = multi-fuel filter.
   */
  selectedFuelIds: string[];
  /** Hide stations that currently have a fuel in shortage. */
  hideShortages: boolean;
  /** Keep only stations with a 24/7 automated pump. */
  only24h: boolean;
  /** Required services (the station must offer all of them). */
  services: string[];

  toggleFuel: (fuelId: string) => void;
  toggleService: (service: string) => void;
  setHideShortages: (value: boolean) => void;
  setOnly24h: (value: boolean) => void;
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

      toggleFuel: (fuelId) =>
        set((state) => ({
          selectedFuelIds: state.selectedFuelIds.includes(fuelId)
            ? state.selectedFuelIds.filter((id) => id !== fuelId)
            : [...state.selectedFuelIds, fuelId],
        })),
      toggleService: (service) =>
        set((state) => ({
          services: state.services.includes(service)
            ? state.services.filter((item) => item !== service)
            : [...state.services, service],
        })),
      setHideShortages: (hideShortages) => set({ hideShortages }),
      setOnly24h: (only24h) => set({ only24h }),
      clearFuels: () => set({ selectedFuelIds: [] }),
      reset: () =>
        set({
          selectedFuelIds: [],
          hideShortages: false,
          only24h: false,
          services: [],
        }),
    }),
    { name: "fuelmap.filters" },
  ),
);

/** Number of advanced filters (excluding fuels) that are active. */
export function countActiveFilters(state: FilterState): number {
  return (
    (state.hideShortages ? 1 : 0) +
    (state.only24h ? 1 : 0) +
    (state.services.length > 0 ? 1 : 0)
  );
}
