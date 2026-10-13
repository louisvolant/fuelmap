import type { CountryDefinition } from "../types";
import { SPAIN_DATA_SOURCE } from "./dataSource";
import { SPANISH_FUELS } from "./fuels";

/**
 * Spain.
 * Fuel prices come from the Ministerio open data REST service.
 */
export const spain: CountryDefinition = {
  code: "ES",
  center: [-3.7038, 40.4168],
  zoom: 5,
  bounds: [-9.3, 36.0, 3.4, 43.8],
  currency: "EUR",
  fuelCatalog: SPANISH_FUELS,
  dataSource: SPAIN_DATA_SOURCE,
};
