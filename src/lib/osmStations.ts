import type { BoundingBox } from "@/countries/types";

export interface OsmFuelStation {
  /** Stable OSM key, e.g. `node/1234` or `way/5678`. */
  key: string;
  lat: number;
  lon: number;
  /** `brand`, `operator` or `name` from OpenStreetMap, when present. */
  brand?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  opening24h: boolean;
}

/** Raw Overpass API shapes (see `worker/index.ts`). */
export interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassPayload {
  elements?: OverpassElement[];
  remark?: string;
  osm3s?: { timestamp_osm_base?: string };
}

/**
 * Is this a trustworthy Overpass answer?
 *
 * A non-empty list speaks for itself. An **empty** one is only accepted when it
 * comes with a real Overpass envelope (an ISO `timestamp_osm_base`): a
 * misconfigured instance was observed answering a perfectly valid
 * `{"elements": []}` — with a bogus timestamp — for all of Paris, which then got
 * cached and removed every brand mark for a week.
 */
export function isTrustworthyOverpassAnswer(payload: OverpassPayload): boolean {
  if (!Array.isArray(payload.elements)) return false;
  // Overpass reports timeouts and rate limits in `remark`.
  if (payload.remark) return false;
  if (payload.elements.length > 0) return true;
  return /^\d{4}-\d{2}-\d{2}T/.test(payload.osm3s?.timestamp_osm_base ?? "");
}

/**
 * OpenStreetMap fuel stations are fetched through the Cloudflare Worker
 * (`/api/osm/v3/stations`, versioned so a stale CDN cache can be bypassed), which
 * queries the Overpass mirrors with a proper User-Agent and caches the result.
 *
 * The public Overpass API is not reliable for direct browser use (it rate-limits
 * and returns 429/504), which previously made brand logos disappear in
 * production. Set `VITE_OSM_API_URL` to point elsewhere (e.g. a self-hosted
 * Overpass) in development.
 */
const ENDPOINT =
  import.meta.env.VITE_OSM_API_URL?.toString() ?? "/api/osm/v3/stations";

interface OsmStationsResponse {
  stations?: OsmFuelStation[];
}

export async function fetchOsmStations(
  bounds: BoundingBox,
  { signal }: { signal?: AbortSignal } = {},
): Promise<OsmFuelStation[]> {
  const [west, south, east, north] = bounds;
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://localhost";
  const url = new URL(ENDPOINT, origin);
  url.searchParams.set("west", String(west));
  url.searchParams.set("south", String(south));
  url.searchParams.set("east", String(east));
  url.searchParams.set("north", String(north));

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`OSM stations request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as OsmStationsResponse;
  return payload.stations ?? [];
}
