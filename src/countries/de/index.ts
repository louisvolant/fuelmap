import type { CountryDefinition } from "../types";
import { GERMANY_DATA_SOURCE } from "./dataSource";
import { GERMAN_FUELS } from "./fuels";

/**
 * Germany.
 * Prices come from Tankerkönig (MTS-K data), fetched per map viewport because
 * no full-country dump is available. Requires `VITE_TANKERKOENIG_API_KEY`.
 */
export const germany: CountryDefinition = {
  code: "DE",
  center: [10.4515, 51.1657],
  zoom: 5,
  bounds: [5.9, 47.3, 15.0, 55.1],
  currency: "EUR",
  fuelCatalog: GERMAN_FUELS,
  dataSource: GERMANY_DATA_SOURCE,
};
