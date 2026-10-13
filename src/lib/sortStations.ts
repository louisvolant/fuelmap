import type { NormalizedStation } from "@/countries/types";
import { distanceMeters } from "@/lib/geo";
import { displayFuel } from "@/lib/stationUtils";

export type StationSort = "price" | "distance";

interface SortStationsOptions {
  sortBy: StationSort;
  /** Fuel whose price is compared. `null` uses the cheapest fuel. */
  fuelId: string | null;
  /** Reference point for distance sorting, as `[lon, lat]`. */
  center?: [number, number];
}

/**
 * Sort stations for the list view.
 * - `price`: cheapest first (stations without a price go last).
 * - `distance`: nearest first (requires a reference point).
 */
export function sortStations(
  stations: NormalizedStation[],
  { sortBy, fuelId, center }: SortStationsOptions,
): NormalizedStation[] {
  const copy = [...stations];

  if (sortBy === "distance" && center) {
    const reference = center;
    return copy.sort(
      (a, b) =>
        distanceMeters(reference, [a.lon, a.lat]) -
        distanceMeters(reference, [b.lon, b.lat]),
    );
  }

  return copy.sort((a, b) => {
    const priceA = displayFuel(a, fuelId)?.price;
    const priceB = displayFuel(b, fuelId)?.price;
    if (priceA === undefined && priceB === undefined) return 0;
    if (priceA === undefined) return 1;
    if (priceB === undefined) return -1;
    return priceA - priceB;
  });
}

/** Distance in meters from a reference point to a station. */
export function stationDistance(
  station: NormalizedStation,
  center: [number, number],
): number {
  return distanceMeters(center, [station.lon, station.lat]);
}
