import type { NormalizedStation } from "@/countries/types";
import { distanceMeters } from "@/lib/geo";
import type { OsmFuelStation } from "@/lib/osmStations";

/** Only stations carrying a brand string can enrich anything. */
function branded(nodes: OsmFuelStation[]): OsmFuelStation[] {
  return nodes.filter((node) => Boolean(node.brand));
}

/**
 * Fill in the `brand` of stations that do not have one, using the nearest OSM
 * fuel station, with a **unique assignment**: each OSM station brands at most
 * one official station (greedy by increasing distance). This avoids branding
 * several official stations with the same node in dense areas.
 *
 * `maxDistanceMeters` is intentionally generous: official and OSM coordinates
 * often differ by a hundred metres. Pure and side-effect free.
 */
export function enrichStationsWithBrands(
  stations: NormalizedStation[],
  nodes: OsmFuelStation[],
  maxDistanceMeters = 120,
): NormalizedStation[] {
  const candidates = branded(nodes);
  if (candidates.length === 0) return stations;

  const result = stations.map((station) => ({ ...station }));

  // Cheap bounding-box prefilter: avoids a trigonometric distance computation
  // for the vast majority of (station, node) pairs.
  const latWindow = maxDistanceMeters / 110_000;
  const lonWindow = maxDistanceMeters / 60_000;

  // Candidate pairs (station without brand ↔ OSM station within reach).
  const pairs: { station: NormalizedStation; index: number; distance: number }[] =
    [];
  for (const station of result) {
    if (station.brand) continue;
    candidates.forEach((node, index) => {
      if (Math.abs(node.lat - station.lat) > latWindow) return;
      if (Math.abs(node.lon - station.lon) > lonWindow) return;
      const distance = distanceMeters(
        [station.lon, station.lat],
        [node.lon, node.lat],
      );
      if (distance <= maxDistanceMeters) {
        pairs.push({ station, index, distance });
      }
    });
  }

  pairs.sort((a, b) => a.distance - b.distance);

  const usedNodes = new Set<number>();
  const brandedStations = new Set<string>();
  for (const { station, index } of pairs) {
    if (usedNodes.has(index) || brandedStations.has(station.id)) continue;
    station.brand = candidates[index].brand;
    usedNodes.add(index);
    brandedStations.add(station.id);
  }

  return result;
}
