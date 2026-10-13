import type { NormalizedStation } from "@/countries/types";
import { distanceMeters } from "@/lib/geo";
import { hasAllFuels } from "@/lib/stationUtils";

export interface StationFilters {
  /**
   * Selected fuel ids. A station must offer **all** of them to be kept.
   * An empty array means "no fuel filter".
   */
  fuelIds: string[];
  /** Hide stations that currently have at least one fuel in shortage. */
  hideShortages: boolean;
  /** Keep only stations with a 24/7 automated pump. */
  only24h: boolean;
  /** Required services (the station must offer all of them). */
  services: string[];
  /** Reference point for the radius filter, as `[lon, lat]`. */
  center?: [number, number];
  /** Maximum distance from `center`, in meters. */
  maxDistanceMeters?: number;
}

export const DEFAULT_STATION_FILTERS: StationFilters = {
  fuelIds: [],
  hideShortages: false,
  only24h: false,
  services: [],
};

/** Apply the active filters to a list of stations (pure, client-side). */
export function applyStationFilters(
  stations: NormalizedStation[],
  filters: StationFilters,
): NormalizedStation[] {
  return stations.filter((station) => {
    if (!hasAllFuels(station, filters.fuelIds)) return false;
    if (filters.only24h && !station.automat24h) return false;
    if (
      filters.hideShortages &&
      station.fuels.some((fuel) => fuel.shortage !== undefined)
    ) {
      return false;
    }
    if (
      filters.services.length > 0 &&
      !filters.services.every((service) => station.services.includes(service))
    ) {
      return false;
    }
    if (filters.center && filters.maxDistanceMeters !== undefined) {
      const distance = distanceMeters(filters.center, [station.lon, station.lat]);
      if (distance > filters.maxDistanceMeters) return false;
    }
    return true;
  });
}

/** Distinct services offered by the given stations, sorted alphabetically. */
export function collectServices(stations: NormalizedStation[]): string[] {
  const services = new Set<string>();
  for (const station of stations) {
    for (const service of station.services) services.add(service);
  }
  return [...services].sort((a, b) => a.localeCompare(b));
}
