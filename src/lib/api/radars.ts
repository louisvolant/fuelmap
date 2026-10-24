import type { RadarFeatureCollection } from "@/lib/radars";

const ENDPOINT = import.meta.env.VITE_RADARS_API_URL?.toString() ?? "/api/fr/radars";

const EMPTY: RadarFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

/**
 * Fixed speed cameras for France, served by the Worker from an R2 snapshot.
 * The whole country is a single small GeoJSON payload, so there is no per-tile
 * request: the browser and the edge cache reuse the same response.
 */
export async function fetchFrenchRadars({
  signal,
}: { signal?: AbortSignal } = {}): Promise<RadarFeatureCollection> {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://localhost";
  const response = await fetch(new URL(ENDPOINT, origin), { signal });
  if (!response.ok) {
    throw new Error(`Radar request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as Partial<RadarFeatureCollection>;
  if (payload.type !== "FeatureCollection" || !Array.isArray(payload.features)) {
    return EMPTY;
  }
  return payload as RadarFeatureCollection;
}
