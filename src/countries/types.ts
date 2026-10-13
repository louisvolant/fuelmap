/**
 * Core domain types, source-agnostic.
 *
 * Every country adapter must normalize its upstream data into these types so
 * that the UI never depends on a specific provider. Adding a new country means
 * implementing `FuelDataSource` and registering a `CountryDefinition`.
 */

/** European countries FuelMap targets. Only `FR` is enabled in the MVP. */
export type CountryCode =
  | "FR"
  | "BE"
  | "LU"
  | "DE"
  | "CH"
  | "IT"
  | "ES"
  | "AD"
  | "MC";

export interface FuelDefinition {
  /** Internal, source-agnostic id, e.g. `"gazole"` or `"e10"`. */
  id: string;
  /** i18n key used to render the display label. */
  labelKey: string;
  /** Hex color used by badges, chips and markers. */
  color: string;
  /**
   * Names used by upstream providers. Adapters match these (case-insensitive)
   * to map a raw fuel name onto the internal `id`.
   */
  aliases: string[];
}

export type ShortageType = "temporary" | "definitive";

export interface FuelShortage {
  type: ShortageType;
  /** ISO 8601 timestamp of when the shortage started, when known. */
  since?: string;
}

export interface NormalizedFuelPrice {
  /** Matches a `FuelDefinition.id` from the owning country catalog. */
  fuelId: string;
  /** Price per liter in the country's currency. */
  price: number;
  /** ISO 4217 code, e.g. `"EUR"`. */
  currency: string;
  /** ISO 8601 timestamp of the last price update from the source. */
  updatedAt: string;
  shortage?: FuelShortage;
}

export interface OpeningHoursPeriod {
  /** `"HH:mm"` */
  from: string;
  /** `"HH:mm"` */
  to: string;
}

export interface OpeningHoursDay {
  /** Day label as provided by the source (not localized by FuelMap). */
  day: string;
  closed: boolean;
  periods: OpeningHoursPeriod[];
}

export interface OpeningHours {
  days: OpeningHoursDay[];
}

export interface NormalizedStation {
  /** Globally unique: `` `${country}:${sourceId}` ``. */
  id: string;
  country: CountryCode;
  /** Decimal degrees. */
  lat: number;
  /** Decimal degrees. */
  lon: number;
  address?: string;
  city?: string;
  postalCode?: string;
  /** Optional: not every source exposes a brand. Absent in the FR open data. */
  brand?: string;
  isHighway: boolean;
  fuels: NormalizedFuelPrice[];
  services: string[];
  openingHours?: OpeningHours;
  /** Whether a card/automated pump is available 24/7. */
  automat24h: boolean;
  /** Raw identifier from the upstream provider. */
  sourceId: string;
}

/**
 * Contract implemented by each country's data adapter.
 * Keeping this interface stable makes it trivial to add countries in phase 2.
 */
export interface FuelDataSource {
  id: string;
  /** Country this source feeds. */
  country: CountryCode;
  /** Fetch and normalize every station of the country. */
  fetchStations(options?: { signal?: AbortSignal }): Promise<NormalizedStation[]>;
  /** Suggested client-side refresh cadence, in milliseconds. */
  refreshIntervalMs: number;
  /** Attribution string displayed in the UI. */
  attribution: string;
}

export interface CountryDefinition {
  code: CountryCode;
  /** Default map center, `[lon, lat]`. */
  center: [number, number];
  /** Default zoom level for the map. */
  zoom: number;
  /** Bounding box `[west, south, east, north]`. */
  bounds: [number, number, number, number];
  /** ISO 4217 currency code used to format prices. */
  currency: string;
  /** Fuels available in this country; drives the filter UI. */
  fuelCatalog: FuelDefinition[];
  /** Pricing source, or `null` when only OSM positions are available. */
  dataSource: FuelDataSource | null;
}
