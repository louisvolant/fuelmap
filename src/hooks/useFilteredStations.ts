import { useMemo } from "react";
import type { NormalizedStation } from "@/countries/types";
import { applyStationFilters, type StationFilters } from "@/lib/filters";
import { useFilterStore } from "@/stores/filterStore";

interface UseFilteredStationsOptions {
  /** Reference point for the radius filter, as `[lon, lat]`. */
  center?: [number, number];
  /** Maximum distance from `center`, in meters. */
  maxDistanceMeters?: number;
}

/**
 * Filter the loaded stations according to the active filters.
 * Filtering is client-side so it is instantaneous.
 */
export function useFilteredStations(
  stations: NormalizedStation[],
  options: UseFilteredStationsOptions = {},
): NormalizedStation[] {
  const selectedFuelIds = useFilterStore((state) => state.selectedFuelIds);
  const hideShortages = useFilterStore((state) => state.hideShortages);
  const only24h = useFilterStore((state) => state.only24h);
  const services = useFilterStore((state) => state.services);
  const { center, maxDistanceMeters } = options;

  const filters = useMemo<StationFilters>(
    () => ({
      fuelIds: selectedFuelIds,
      hideShortages,
      only24h,
      services,
      center,
      maxDistanceMeters,
    }),
    [selectedFuelIds, hideShortages, only24h, services, center, maxDistanceMeters],
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
