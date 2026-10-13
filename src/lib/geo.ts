const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in meters between two `[lon, lat]` points. */
export function distanceMeters(
  a: [number, number],
  b: [number, number],
): number {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const h =
    sinLat * sinLat +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinLon * sinLon;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Bounding box `[west, south, east, north]` around a point and a radius. */
export function boundingBox(
  center: [number, number],
  radiusMeters: number,
): [number, number, number, number] {
  const [lon, lat] = center;
  const latDelta = (radiusMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  const lonDelta =
    latDelta / Math.max(Math.cos(toRadians(lat)), Number.EPSILON);
  return [lon - lonDelta, lat - latDelta, lon + lonDelta, lat + latDelta];
}
