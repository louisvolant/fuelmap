import type { BoundingBox } from "@/countries/types";

export interface OsmFuelStation {
  /** Stable OSM key, e.g. `node/1234` or `way/5678`. */
  key: string;
  lat: number;
  lon: number;
  brand?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  opening24h: boolean;
}

const OVERPASS_URL =
  import.meta.env.VITE_OVERPASS_URL?.toString() ??
  "https://overpass-api.de/api/interpreter";

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Fetch OpenStreetMap fuel stations within a bounding box.
 * Used for the countries that have no per-station price source
 * (Belgium, Luxembourg, Switzerland).
 */
export async function fetchOsmFuelStations(
  bounds: BoundingBox,
  { signal }: { signal?: AbortSignal } = {},
): Promise<OsmFuelStation[]> {
  const [west, south, east, north] = bounds;
  const query = `[out:json][timeout:25];nwr["amenity"="fuel"](${south},${west},${north},${east});out center tags;`;

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }).toString(),
  });
  if (!response.ok) {
    throw new Error(`Overpass request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { elements?: OverpassElement[] };
  const stations: OsmFuelStation[] = [];

  for (const element of payload.elements ?? []) {
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const tags = element.tags ?? {};
    const street = tags["addr:street"];
    const number = tags["addr:housenumber"];
    const address = [number, street].filter(Boolean).join(" ").trim();

    stations.push({
      key: `${element.type}/${element.id}`,
      lat: lat as number,
      lon: lon as number,
      brand: tags.brand ?? tags.operator ?? tags.name,
      city: tags["addr:city"] ?? tags["addr:town"] ?? tags["addr:village"],
      address: address || undefined,
      postalCode: tags["addr:postcode"],
      opening24h: tags.opening_hours === "24/7",
    });
  }

  return stations;
}
