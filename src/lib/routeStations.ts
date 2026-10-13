import type { NormalizedStation } from "@/countries/types";

const EARTH_RADIUS_M = 6_371_000;

/** Project `[lon, lat]` to local meters (equirectangular, around `lat0`). */
function project(lon: number, lat: number, lat0: number): [number, number] {
  const x = (lon * Math.PI * EARTH_RADIUS_M * Math.cos((lat0 * Math.PI) / 180)) / 180;
  const y = (lat * Math.PI * EARTH_RADIUS_M) / 180;
  return [x, y];
}

/** Distance in meters from a point to a segment, in projected space. */
function pointToSegment(
  point: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSquared,
          ),
        );
  return Math.hypot(point[0] - (a[0] + t * dx), point[1] - (a[1] + t * dy));
}

/** Shortest distance (meters) between a point and a route polyline. */
export function distanceToRouteMeters(
  station: Pick<NormalizedStation, "lon" | "lat">,
  route: [number, number][],
): number {
  if (route.length === 0) return Number.POSITIVE_INFINITY;
  if (route.length === 1) {
    const [ax, ay] = project(route[0][0], route[0][1], station.lat);
    const [px, py] = project(station.lon, station.lat, station.lat);
    return Math.hypot(px - ax, py - ay);
  }

  const point = project(station.lon, station.lat, station.lat);
  let minimum = Number.POSITIVE_INFINITY;

  for (let i = 0; i < route.length - 1; i += 1) {
    const a = project(route[i][0], route[i][1], station.lat);
    const b = project(route[i + 1][0], route[i + 1][1], station.lat);
    minimum = Math.min(minimum, pointToSegment(point, a, b));
  }

  return minimum;
}

/**
 * Keep only the stations within `maxDistanceMeters` of the route.
 * Results are ordered by distance along the route is out of scope here: the
 * caller re-sorts (e.g. by price) afterwards.
 */
export function stationsAlongRoute(
  stations: NormalizedStation[],
  route: [number, number][],
  maxDistanceMeters: number,
): NormalizedStation[] {
  return stations.filter(
    (station) => distanceToRouteMeters(station, route) <= maxDistanceMeters,
  );
}
