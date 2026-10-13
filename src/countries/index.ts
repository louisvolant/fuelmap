import type { CountryCode, CountryDefinition } from "./types";
import { france } from "./fr";

/**
 * Registry of enabled countries.
 *
 * Phase 1 ships France only. Additional European countries (BE, LU, DE, CH, IT,
 * ES, AD, MC) are added here in phase 2 alongside their `FuelDataSource`
 * adapter; the rest of the app needs no change.
 */
export const COUNTRIES: Partial<Record<CountryCode, CountryDefinition>> = {
  FR: france,
};

export const DEFAULT_COUNTRY: CountryCode = "FR";

export function getCountry(code: CountryCode): CountryDefinition {
  const country = COUNTRIES[code];
  if (!country) {
    throw new Error(`Country "${code}" is not enabled yet`);
  }
  return country;
}

export function isCountryEnabled(code: CountryCode): boolean {
  return COUNTRIES[code] !== undefined;
}

export * from "./types";
