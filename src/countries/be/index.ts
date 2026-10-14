import type { CountryDefinition } from "../types";
import { createOsmAreaSource } from "../osm/source";

/**
 * Belgium.
 * No per-station price API exists: stations come from OpenStreetMap (positions
 * only) and the official national **maximum** prices are shown separately.
 */
export const belgium: CountryDefinition = {
  code: "BE",
  center: [4.4699, 50.5039],
  zoom: 7,
  bounds: [2.5, 49.5, 6.4, 51.5],
  currency: "EUR",
  priceMode: "national-max",
  fuelCatalog: [],
  dataSource: createOsmAreaSource({ id: "be-osm", country: "BE" }),
};
