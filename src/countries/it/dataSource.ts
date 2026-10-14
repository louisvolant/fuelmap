import type {
  BulkFuelDataSource,
  NormalizedFuelPrice,
  NormalizedStation,
} from "../types";
import type { ItalianStation, ItalianStationsPayload } from "@/lib/italyFuel";

/**
 * Italy goes through the Cloudflare Worker (`/api/it/stations`), which fetches
 * and joins the two MIMIT CSV files (no CORS upstream) and caches the result.
 */
const ENDPOINT =
  import.meta.env.VITE_IT_FUEL_API_URL?.toString() ?? "/api/it/stations";

const CURRENCY = "EUR";

export type RawItStation = ItalianStation;
export type RawItResponse = ItalianStationsPayload;

/** Normalize a station produced by the worker into the domain model. */
export function normalizeItStation(
  raw: RawItStation,
  updatedAt: string | undefined,
): NormalizedStation | null {
  if (!Number.isFinite(raw.lat) || !Number.isFinite(raw.lon)) return null;

  const fuels: NormalizedFuelPrice[] = Object.entries(raw.prices ?? {})
    .filter(([, price]) => typeof price === "number" && Number.isFinite(price))
    .map(([fuelId, price]) => ({
      fuelId,
      price,
      currency: CURRENCY,
      updatedAt,
      available: true,
    }));

  if (fuels.length === 0) return null;

  return {
    id: `IT:${raw.id}`,
    country: "IT",
    lat: raw.lat,
    lon: raw.lon,
    address: raw.address,
    city: raw.city,
    brand: raw.brand,
    isHighway: Boolean(raw.highway),
    fuels,
    services: [],
    automat24h: false,
    sourceId: raw.id,
  };
}

export const ITALY_DATA_SOURCE: BulkFuelDataSource = {
  id: "it-mimit",
  country: "IT",
  kind: "bulk",
  refreshIntervalMs: 6 * 60 * 60 * 1000,
  attribution: "Prezzi carburanti — MIMIT / Osservaprezzi (IODL 2.0)",
  async fetchStations({ signal } = {}) {
    const response = await fetch(ENDPOINT, { signal });
    if (!response.ok) {
      throw new Error(`Italian fuel API failed with status ${response.status}`);
    }
    const payload = (await response.json()) as RawItResponse;
    const updatedAt = payload.updatedAt ?? undefined;
    return payload.stations
      .map((raw) => normalizeItStation(raw, updatedAt))
      .filter((station): station is NormalizedStation => station !== null);
  },
};
