import type { BoundingBox } from "@/countries/types";

/**
 * Persistent brand-resolution overlay.
 *
 * The French open data carries no brand, so brands are resolved by matching
 * official stations against OpenStreetMap nodes (see `osmBrands.ts`). That
 * match is stable for months but used to be recomputed from scratch on every
 * viewport change and lost on reload. This module is the long-lived overlay:
 * `stationId -> brand`, keyed per station with a resolver version and timestamp,
 * plus a stable bounding-box key so small pans reuse the same OSM cache entry.
 */

/** Bump when the matching algorithm changes and old resolutions must be ignored. */
export const BRAND_RESOLVER_VERSION = "v1";

/** Brand resolutions are quasi-immutable: keep them far longer than raw OSM data. */
export const BRAND_RESOLUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** Raw OSM cache lives a week; resolutions live three months. */
export const OSM_TILE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Quantization step (degrees) for stable bbox keys. ~0.05° is ~4km in France. */
export const STABLE_BBOX_STEP = 0.05;

export interface BrandResolution {
  /** Station id, e.g. `"FR:12345"`. */
  stationId: string;
  /** Raw brand string resolved from OpenStreetMap. */
  brand: string;
  /** OSM node that provided the brand, e.g. `"node/123"`. */
  osmKey?: string;
  /** Station coordinates at resolution time, used to detect moved stations. */
  lat: number;
  lon: number;
  /** Distance (meters) between the official and OSM positions, when known. */
  distanceM?: number;
  /** Epoch milliseconds of the resolution. */
  resolvedAt: number;
  /** Resolver version that produced this entry. */
  resolverVersion: string;
}

/** A resolution is usable when its version matches and it is not expired. */
export function isResolutionFresh(
  resolution: BrandResolution,
  now = Date.now(),
): boolean {
  return (
    resolution.resolverVersion === BRAND_RESOLVER_VERSION &&
    now - resolution.resolvedAt < BRAND_RESOLUTION_TTL_MS
  );
}

function quantize(value: number, step = STABLE_BBOX_STEP): number {
  return Math.round(value / step) * step;
}

/**
 * Stable bounding-box key: quantization absorbs micro-pans so the same cache
 * entry is reused instead of refetching OpenStreetMap on every pixel move.
 */
export function stableBboxKey(
  bounds: BoundingBox,
  step = STABLE_BBOX_STEP,
): string {
  return bounds.map((value) => quantize(value, step).toFixed(2)).join(",");
}

/**
 * Apply cached resolutions to stations that still lack a brand. Pure: returns
 * new objects only for stations that gain a brand. Entries for stations that
 * moved significantly (>50m) are ignored so a stale brand never sticks to a
 * relocated station.
 */
export function applyBrandResolutions<
  T extends { id: string; brand?: string; lat: number; lon: number },
>(stations: T[], resolutions: Map<string, BrandResolution> | Record<string, BrandResolution>, now = Date.now()): T[] {
  const lookup =
    resolutions instanceof Map
      ? resolutions
      : new Map(Object.entries(resolutions));
  let changed = false;
  const result = stations.map((station) => {
    if (station.brand) return station;
    const resolution = lookup.get(station.id);
    if (!resolution || !resolution.brand || !isResolutionFresh(resolution, now)) {
      return station;
    }
    // Ignore resolutions computed for a station that has since moved.
    const moved =
      Math.abs(resolution.lat - station.lat) > 0.0005 ||
      Math.abs(resolution.lon - station.lon) > 0.0005;
    if (moved) return station;
    changed = true;
    return { ...station, brand: resolution.brand };
  });
  // Return the original array reference when nothing changed to avoid re-renders.
  return changed ? result : stations;
}

/**
 * Build resolution records for stations that gained a brand through OSM
 * enrichment. Callers persist the returned records in IndexedDB.
 */
export function collectNewResolutions<
  T extends { id: string; brand?: string; lat: number; lon: number },
>(
  before: T[],
  after: T[],
  osmKeyByStationId: Map<string, string> = new Map(),
  now = Date.now(),
): BrandResolution[] {
  const brandBefore = new Map(before.map((station) => [station.id, station.brand]));
  const resolutions: BrandResolution[] = [];
  for (const station of after) {
    if (!station.brand) continue;
    if (brandBefore.get(station.id)) continue;
    resolutions.push({
      stationId: station.id,
      brand: station.brand,
      osmKey: osmKeyByStationId.get(station.id),
      lat: station.lat,
      lon: station.lon,
      resolvedAt: now,
      resolverVersion: BRAND_RESOLVER_VERSION,
    });
  }
  return resolutions;
}
