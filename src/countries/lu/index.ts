import type { CountryDefinition } from "../types";
import { createOsmAreaSource } from "../osm/source";

/**
 * Luxembourg.
 * No per-station price API exists: stations come from OpenStreetMap (positions
 * only) and the official national **maximum** prices are shown separately.
 */
export const luxembourg: CountryDefinition = {
  code: "LU",
  center: [6.1296, 49.8153],
  zoom: 9,
  bounds: [5.7, 49.4, 6.6, 50.2],
  currency: "EUR",
  priceMode: "national-max",
  fuelCatalog: [],
  dataSource: createOsmAreaSource({ id: "lu-osm", country: "LU" }),
};
