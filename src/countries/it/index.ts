import type { CountryDefinition } from "../types";
import { ITALY_DATA_SOURCE } from "./dataSource";
import { ITALIAN_FUELS } from "./fuels";

/**
 * Italy.
 * Prices come from the MIMIT Osservaprezzi open data (daily), proxied and
 * joined by the Cloudflare Worker.
 */
export const italy: CountryDefinition = {
  code: "IT",
  center: [12.5674, 41.8719],
  zoom: 5,
  bounds: [6.6, 36.6, 18.6, 47.1],
  currency: "EUR",
  priceMode: "station",
  fuelCatalog: ITALIAN_FUELS,
  dataSource: ITALY_DATA_SOURCE,
};
