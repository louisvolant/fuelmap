import type { NormalizedFuelPrice, NormalizedStation } from "@/countries/types";

/** Fuels that currently have a price (i.e. available at the pump). */
export function availableFuels(station: NormalizedStation): NormalizedFuelPrice[] {
  return station.fuels.filter(
    (fuel) => fuel.available && typeof fuel.price === "number",
  );
}

/** Cheapest available fuel of a station, or `undefined` when it has none. */
export function cheapestFuel(
  station: NormalizedStation,
): NormalizedFuelPrice | undefined {
  return availableFuels(station).reduce<NormalizedFuelPrice | undefined>(
    (cheapest, fuel) =>
      !cheapest || (fuel.price as number) < (cheapest.price as number)
        ? fuel
        : cheapest,
    undefined,
  );
}

/**
 * Fuel whose price should be shown on the map for a station.
 * When `fuelId` is provided (active filter) the matching fuel is used, otherwise
 * the cheapest available fuel is displayed.
 */
export function displayFuel(
  station: NormalizedStation,
  fuelId?: string | null,
): NormalizedFuelPrice | undefined {
  if (fuelId) {
    return station.fuels.find(
      (fuel) => fuel.fuelId === fuelId && fuel.available && fuel.price !== undefined,
    );
  }
  return cheapestFuel(station);
}

/** Whether a station offers every fuel in `fuelIds`. */
export function hasAllFuels(station: NormalizedStation, fuelIds: string[]): boolean {
  if (fuelIds.length === 0) return true;
  return fuelIds.every((fuelId) =>
    station.fuels.some(
      (fuel) => fuel.fuelId === fuelId && fuel.available && fuel.price !== undefined,
    ),
  );
}
