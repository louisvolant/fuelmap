import { useMemo } from "react";
import type { NormalizedStation } from "@/countries/types";
import { applyStationFilters, type StationFilters } from "@/lib/filters";
import { useFilterStore } from "@/stores/filterStore";

/**
 * Filter the loaded stations according to the active filters.
 * Filtering is client-side so it is instantaneous.
 */
export function useFilteredStations(
  stations: NormalizedStation[],
): NormalizedStation[] {
  const selectedFuelIds = useFilterStore((state) => state.selectedFuelIds);

  const filters = useMemo<StationFilters>(
    () => ({ fuelIds: selectedFuelIds }),
    [selectedFuelIds],
  );

  return useMemo(
    () => applyStationFilters(stations, filters),
    [stations, filters],
  );
}

/** Fuel whose price is shown on markers: the first selected fuel, or `null`. */
export function useActiveFuelId(): string | null {
  return useFilterStore((state) => state.selectedFuelIds[0] ?? null);
}
