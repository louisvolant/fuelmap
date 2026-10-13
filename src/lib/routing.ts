export interface RouteResult {
  /** Route geometry as `[lon, lat]` pairs. */
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Routing backend. Defaults to the public OSRM demo server (CORS-enabled).
 * For production, point `VITE_OSRM_URL` at a self-hosted instance or a
 * Cloudflare Worker proxy.
 */
const OSRM_BASE =
  import.meta.env.VITE_OSRM_URL?.toString() ?? "https://router.project-osrm.org";

/** Compute a driving route between two `[lon, lat]` points. */
export async function fetchRoute(
  from: [number, number],
  to: [number, number],
  { signal }: { signal?: AbortSignal } = {},
): Promise<RouteResult> {
  const path = `route/v1/driving/${from[0]},${from[1]};${to[0]},${to[1]}`;
  const url = new URL(path, OSRM_BASE);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Routing failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    routes?: {
      geometry: { coordinates: [number, number][] };
      distance: number;
      duration: number;
    }[];
  };

  const route = payload.routes?.[0];
  if (!route) throw new Error("No route found");

  return {
    coordinates: route.geometry.coordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
}
