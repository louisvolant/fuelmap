export interface GeoIpResult {
  country: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
}

/**
 * Coarse location derived from the client IP address by the Cloudflare Worker
 * (`/api/geo`, based on `request.cf`). No third party, no API key.
 */
const GEO_ENDPOINT =
  import.meta.env.VITE_GEO_API_URL?.toString() ?? "/api/geo";

export async function fetchGeoIp({
  signal,
}: { signal?: AbortSignal } = {}): Promise<GeoIpResult> {
  const response = await fetch(GEO_ENDPOINT, { signal });
  if (!response.ok) {
    throw new Error(`Geo lookup failed with status ${response.status}`);
  }
  return (await response.json()) as GeoIpResult;
}
