import {
  BRAND_RESOLVER_VERSION,
  type BrandResolution,
} from "@/lib/brandResolutions";

/** Worker snapshot version. Must match `BRAND_SNAPSHOT_VERSION` server-side. */
export const BRAND_SNAPSHOT_VERSION = "v1";

const MANIFEST_ENDPOINT = "/api/fr/brands/manifest";
const SNAPSHOT_ENDPOINT = "/api/fr/brands/snapshot";

interface BrandSnapshotManifest {
  version?: string;
  resolverVersion?: string;
  updatedAt?: number | null;
  count?: number;
}

interface BrandSnapshotEntry {
  brand?: unknown;
  osmKey?: unknown;
  lat?: unknown;
  lon?: unknown;
  distanceM?: unknown;
  resolvedAt?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Validate a snapshot payload into brand resolutions. Pure and strict: entries
 * with a missing brand, non-finite coordinates, or a version mismatch are
 * dropped so a bad publish can never poison the overlay.
 */
export function parseBrandSnapshot(payload: unknown, now = Date.now()): BrandResolution[] {
  if (!isRecord(payload)) return [];
  const version =
    typeof payload.version === "string" ? payload.version : undefined;
  if (version !== undefined && version !== BRAND_SNAPSHOT_VERSION) return [];
  const brands = payload.brands;
  if (!isRecord(brands)) return [];

  const resolutions: BrandResolution[] = [];
  for (const [stationId, raw] of Object.entries(brands)) {
    if (!stationId || !isRecord(raw)) continue;
    const entry = raw as BrandSnapshotEntry;
    if (typeof entry.brand !== "string" || entry.brand.length === 0) continue;
    if (!Number.isFinite(entry.lat) || !Number.isFinite(entry.lon)) continue;
    const resolvedAt =
      typeof entry.resolvedAt === "number" ? entry.resolvedAt : now;
    resolutions.push({
      stationId,
      brand: entry.brand,
      osmKey: typeof entry.osmKey === "string" ? entry.osmKey : undefined,
      lat: entry.lat as number,
      lon: entry.lon as number,
      distanceM:
        typeof entry.distanceM === "number" ? entry.distanceM : undefined,
      resolvedAt,
      resolverVersion: BRAND_RESOLVER_VERSION,
    });
  }
  return resolutions;
}

/**
 * Fetch the precomputed French brand snapshot: manifest first (cheap, decides
 * whether a snapshot exists), then the full payload. Returns `null` when
 * unpublished, version-mismatched, or unreachable — callers fall back to live
 * OSM enrichment.
 */
export async function fetchBrandSnapshot(options: { signal?: AbortSignal } = {}): Promise<BrandResolution[] | null> {
  const manifestResponse = await fetch(MANIFEST_ENDPOINT, {
    signal: options.signal,
  });
  if (!manifestResponse.ok) return null;
  const manifest = (await manifestResponse.json()) as BrandSnapshotManifest;
  if (
    manifest.version !== BRAND_SNAPSHOT_VERSION ||
    !manifest.count ||
    manifest.count <= 0
  ) {
    return null;
  }

  const snapshotResponse = await fetch(SNAPSHOT_ENDPOINT, {
    signal: options.signal,
  });
  if (!snapshotResponse.ok) return null;
  return parseBrandSnapshot(await snapshotResponse.json());
}
