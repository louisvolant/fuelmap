import type { CountryCode, CountryDefinition } from "./types";
import { france } from "./fr";
import { spain } from "./es";
import { germany } from "./de";
import { italy } from "./it";
import { belgium } from "./be";
import { luxembourg } from "./lu";
import { switzerland } from "./ch";

/**
 * Registry of enabled countries.
 *
 * France, Spain, Germany and Italy expose per-station prices. Belgium and
 * Luxembourg only publish a regulated national maximum price; Switzerland has no
 * price data at all — those three use OpenStreetMap for station positions.
 *
 * Adding a country only requires a `CountryDefinition` and, when relevant, a
 * `FuelDataSource` adapter.
 */
export const COUNTRIES: Partial<Record<CountryCode, CountryDefinition>> = {
  FR: france,
  BE: belgium,
  LU: luxembourg,
  DE: germany,
  CH: switzerland,
  IT: italy,
  ES: spain,
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
