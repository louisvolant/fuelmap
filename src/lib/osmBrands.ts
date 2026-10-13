import type { BoundingBox, NormalizedStation } from "@/countries/types";
import { distanceMeters } from "@/lib/geo";

export interface OsmFuelNode {
  lat: number;
  lon: number;
  brand: string;
}

const OVERPASS_URL =
  import.meta.env.VITE_OVERPASS_URL?.toString() ??
  "https://overpass-api.de/api/interpreter";

/**
 * Fetch OpenStreetMap fuel stations (with a usable brand tag) for a bounding
 * box. Used to enrich French stations, whose official data has no brand.
 */
export async function fetchOsmFuelBrands(
  bounds: BoundingBox,
  { signal }: { signal?: AbortSignal } = {},
): Promise<OsmFuelNode[]> {
  const [west, south, east, north] = bounds;
  const query = `[out:json][timeout:25];node["amenity"="fuel"](${south},${west},${north},${east});out tags;`;

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }).toString(),
  });
  if (!response.ok) {
    throw new Error(`Overpass request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    elements?: {
      lat: number;
      lon: number;
      tags?: Record<string, string>;
    }[];
  };

  const nodes: OsmFuelNode[] = [];
  for (const element of payload.elements ?? []) {
    const brand =
      element.tags?.brand ?? element.tags?.operator ?? element.tags?.name;
    if (!brand) continue;
    if (!Number.isFinite(element.lat) || !Number.isFinite(element.lon)) continue;
    nodes.push({ lat: element.lat, lon: element.lon, brand });
  }
  return nodes;
}

/**
 * Fill in the `brand` of stations that do not have one, using the nearest OSM
 * node within `maxDistanceMeters`. Pure and side-effect free.
 */
export function enrichStationsWithBrands(
  stations: NormalizedStation[],
  nodes: OsmFuelNode[],
  maxDistanceMeters = 60,
): NormalizedStation[] {
  if (nodes.length === 0) return stations;

  return stations.map((station) => {
    if (station.brand) return station;

    let nearest: OsmFuelNode | undefined;
    let nearestDistance = maxDistanceMeters;

    for (const node of nodes) {
      const distance = distanceMeters(
        [station.lon, station.lat],
        [node.lon, node.lat],
      );
      if (distance <= nearestDistance) {
        nearestDistance = distance;
        nearest = node;
      }
    }

    return nearest ? { ...station, brand: nearest.brand } : station;
  });
}
