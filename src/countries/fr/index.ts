import type { CountryDefinition } from "../types";
import { FRANCE_DATA_SOURCE } from "./dataSource";
import { FRENCH_FUELS } from "./fuels";

/**
 * France: MVP country.
 * Fuel prices come from the DGCCRF open data (updated every 10 minutes).
 */
export const france: CountryDefinition = {
  code: "FR",
  center: [2.2137, 46.2276],
  zoom: 5,
  bounds: [-5.5, 41.2, 9.9, 51.3],
  currency: "EUR",
  fuelCatalog: FRENCH_FUELS,
  dataSource: FRANCE_DATA_SOURCE,
};
