import type { CountryDefinition } from "../types";
import { createOsmAreaSource } from "../osm/source";

/**
 * Switzerland.
 * There is no official per-station price source: stations come from
 * OpenStreetMap and carry no price.
 */
export const switzerland: CountryDefinition = {
  code: "CH",
  center: [8.2275, 46.8182],
  zoom: 7,
  bounds: [5.9, 45.8, 10.5, 47.8],
  currency: "CHF",
  priceMode: "none",
  fuelCatalog: [],
  dataSource: createOsmAreaSource({ id: "ch-osm", country: "CH" }),
};
