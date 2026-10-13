import type {
  AreaFuelDataSource,
  BoundingBox,
  NormalizedFuelPrice,
  NormalizedStation,
} from "../types";
import { distanceMeters } from "@/lib/geo";
import { GERMAN_FUELS } from "./fuels";

const CURRENCY = "EUR";

/** Tankerkönig caps the query radius at 25 km. */
const MAX_RADIUS_KM = 25;

/**
 * By default Germany goes through the Cloudflare Worker proxy
 * (`/api/de/stations`), which injects the Tankerkönig API key server-side so it
 * never ships to the browser.
 *
 * Set `VITE_DE_FUEL_API_URL` to call Tankerkönig directly (e.g. local dev
 * without a Worker); `VITE_TANKERKOENIG_API_KEY` is then appended if provided.
 */
const PROXY_ENDPOINT = "/api/de/stations";
const DIRECT_ENDPOINT = import.meta.env.VITE_DE_FUEL_API_URL?.toString();
const DIRECT_API_KEY = import.meta.env.VITE_TANKERKOENIG_API_KEY?.toString();

function buildListUrl(lat: number, lon: number, radiusKm: number): URL {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://localhost";
  const url = new URL(DIRECT_ENDPOINT ?? PROXY_ENDPOINT, origin);
  url.searchParams.set("lat", lat.toFixed(5));
  url.searchParams.set("lng", lon.toFixed(5));
  url.searchParams.set("rad", String(radiusKm));
  url.searchParams.set("sort", "dist");
  url.searchParams.set("type", "all");
  if (DIRECT_ENDPOINT && DIRECT_API_KEY) {
    url.searchParams.set("apikey", DIRECT_API_KEY);
  }
  return url;
}

export interface RawDeStation {
  id: string;
  name?: string;
  brand?: string;
  street?: string;
  houseNumber?: string;
  postCode?: string;
  place?: string;
  lat: number;
  lng: number;
  dist?: number;
  diesel?: number | false;
  e5?: number | false;
  e10?: number | false;
  isOpen?: boolean;
}

interface RawDeResponse {
  ok: boolean;
  message?: string;
  stations?: RawDeStation[];
}

function toFuel(
  fuelId: string,
  value: number | false | undefined,
  updatedAt: string,
): NormalizedFuelPrice | null {
  if (typeof value !== "number") return null;
  return {
    fuelId,
    price: value,
    currency: CURRENCY,
    updatedAt,
    available: true,
  };
}

export function normalizeDeStation(
  raw: RawDeStation,
  updatedAt: string,
): NormalizedStation | null {
  if (!Number.isFinite(raw.lat) || !Number.isFinite(raw.lng)) return null;

  const fuels = GERMAN_FUELS.map((definition) =>
    toFuel(definition.id, raw[definition.id as keyof RawDeStation] as number | false, updatedAt),
  ).filter((fuel): fuel is NormalizedFuelPrice => fuel !== null);

  const address = [raw.street, raw.houseNumber].filter(Boolean).join(" ").trim();

  return {
    id: `DE:${raw.id}`,
    country: "DE",
    lat: raw.lat,
    lon: raw.lng,
    address: address || undefined,
    city: raw.place,
    postalCode: raw.postCode,
    brand: raw.brand || undefined,
    isHighway: false,
    fuels,
    services: [],
    // Tankerkönig does not expose 24/7 pumps or opening hours.
    automat24h: false,
    sourceId: raw.id,
  };
}

function inBounds(station: NormalizedStation, [west, south, east, north]: BoundingBox) {
  return (
    station.lon >= west &&
    station.lon <= east &&
    station.lat >= south &&
    station.lat <= north
  );
}

/** Radius (km) needed to cover a bounding box, capped at Tankerkönig's limit. */
function radiusForBounds([west, south, east, north]: BoundingBox): number {
  const center: [number, number] = [(west + east) / 2, (south + north) / 2];
  const corner: [number, number] = [east, north];
  const km = distanceMeters(center, corner) / 1000;
  return Math.max(1, Math.min(MAX_RADIUS_KM, Math.ceil(km)));
}

/**
 * Germany: area-based source.
 * Tankerkönig has no full-country dump, so stations are fetched for the current
 * viewport and accumulated client-side.
 */
export const GERMANY_DATA_SOURCE: AreaFuelDataSource = {
  id: "de-tankerkoenig",
  country: "DE",
  kind: "area",
  refreshIntervalMs: 5 * 60 * 1000,
  attribution: "Tankerkönig — MTS-K (CC BY 4.0)",
  async fetchArea(bounds, { signal } = {}) {
    const [west, south, east, north] = bounds;
    const lat = (south + north) / 2;
    const lon = (west + east) / 2;

    const url = buildListUrl(lat, lon, radiusForBounds(bounds));

    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Tankerkönig request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as RawDeResponse;
    if (!payload.ok) {
      throw new Error(payload.message ?? "Tankerkönig returned an error");
    }

    // Tankerkönig does not expose a per-station price timestamp: prices are
    // near-real-time (MTS-K), so the fetch time is the best available estimate.
    const updatedAt = new Date().toISOString();

    return (payload.stations ?? [])
      .map((raw) => normalizeDeStation(raw, updatedAt))
      .filter(
        (station): station is NormalizedStation =>
          station !== null && inBounds(station, bounds),
      );
  },
};
