import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FilterState {
  /**
   * Selected fuels. Empty means "all fuels".
   * One entry = single-fuel filter; several = multi-fuel filter.
   */
  selectedFuelIds: string[];
  toggleFuel: (fuelId: string) => void;
  clearFuels: () => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      selectedFuelIds: [],
      toggleFuel: (fuelId) =>
        set((state) => ({
          selectedFuelIds: state.selectedFuelIds.includes(fuelId)
            ? state.selectedFuelIds.filter((id) => id !== fuelId)
            : [...state.selectedFuelIds, fuelId],
        })),
      clearFuels: () => set({ selectedFuelIds: [] }),
      reset: () => set({ selectedFuelIds: [] }),
    }),
    { name: "fuelmap.filters" },
  ),
);
