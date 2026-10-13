import type { NormalizedStation } from "@/countries/types";
import { hasAllFuels } from "@/lib/stationUtils";

export interface StationFilters {
  /**
   * Selected fuel ids. A station must offer **all** of them to be kept.
   * An empty array means "no fuel filter".
   */
  fuelIds: string[];
}

export const DEFAULT_STATION_FILTERS: StationFilters = {
  fuelIds: [],
};

/** Apply the active filters to a list of stations (pure, client-side). */
export function applyStationFilters(
  stations: NormalizedStation[],
  filters: StationFilters,
): NormalizedStation[] {
  return stations.filter((station) =>
    hasAllFuels(station, filters.fuelIds),
  );
}
