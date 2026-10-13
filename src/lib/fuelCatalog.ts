import type { FuelDefinition } from "@/countries/types";

/**
 * Find a fuel definition by its internal id.
 */
export function getFuel(
  catalog: FuelDefinition[],
  fuelId: string,
): FuelDefinition | undefined {
  return catalog.find((fuel) => fuel.id === fuelId);
}

/**
 * Resolve a raw, provider-specific fuel name to a fuel definition using the
 * catalog aliases. Matching is trimmed and case-insensitive.
 */
export function findFuelByAlias(
  catalog: FuelDefinition[],
  rawName: string,
): FuelDefinition | undefined {
  const normalized = rawName.trim().toLowerCase();
  if (!normalized) return undefined;

  return catalog.find(
    (fuel) =>
      fuel.id.toLowerCase() === normalized ||
      fuel.aliases.some((alias) => alias.toLowerCase() === normalized),
  );
}

/** Return the ordered list of internal fuel ids for a catalog. */
export function fuelIds(catalog: FuelDefinition[]): string[] {
  return catalog.map((fuel) => fuel.id);
}
