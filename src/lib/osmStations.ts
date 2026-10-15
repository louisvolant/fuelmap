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

/**
 * OpenStreetMap fuel stations are fetched through the Cloudflare Worker
 * (`/api/osm/stations`), which queries the Overpass mirrors with a proper
 * User-Agent and caches the result at the edge for a week.
 *
 * The public Overpass API is not reliable for direct browser use (it rate-limits
 * and returns 429/504), which previously made brand logos disappear in
 * production. Set `VITE_OSM_API_URL` to point elsewhere (e.g. a self-hosted
 * Overpass) in development.
 */
const ENDPOINT =
  import.meta.env.VITE_OSM_API_URL?.toString() ?? "/api/osm/v2/stations";

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
