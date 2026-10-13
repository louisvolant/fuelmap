import type { CountryCode, CountryDefinition } from "./types";
import { france } from "./fr";
import { spain } from "./es";
import { germany } from "./de";

/**
 * Registry of enabled countries.
 *
 * Phase 1 shipped France. Spain and Germany are the phase-2 additions, chosen
 * because they border France and expose per-station price data. A country is
 * only listed here once its `FuelDataSource` adapter exists; the rest of the app
 * needs no change.
 */
export const COUNTRIES: Partial<Record<CountryCode, CountryDefinition>> = {
  FR: france,
  ES: spain,
  DE: germany,
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

/** Countries currently enabled, in registry order. */
export function enabledCountries(): CountryDefinition[] {
  return Object.values(COUNTRIES).filter(
    (country): country is CountryDefinition => country !== undefined,
  );
}

export * from "./types";
