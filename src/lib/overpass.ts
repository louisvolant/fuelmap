/**
 * Overpass (OpenStreetMap) response shapes and validation.
 *
 * Shared by the browser client and the Cloudflare Worker, so it must stay free
 * of `import.meta.env` and of any other bundler-specific global.
 */

export interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassPayload {
  elements?: OverpassElement[];
  remark?: string;
  osm3s?: { timestamp_osm_base?: string };
}

/**
 * Is this a trustworthy Overpass answer?
 *
 * A non-empty list speaks for itself. An **empty** one is only accepted when it
 * comes with a real Overpass envelope (an ISO `timestamp_osm_base`): a
 * misconfigured instance was observed answering a perfectly valid
 * `{"elements": []}` — with a bogus timestamp — for all of Paris, which then got
 * cached and removed every brand mark for a week.
 */
export function isTrustworthyOverpassAnswer(payload: OverpassPayload): boolean {
  if (!Array.isArray(payload.elements)) return false;
  // Overpass reports timeouts and rate limits in `remark`.
  if (payload.remark) return false;
  if (payload.elements.length > 0) return true;
  return /^\d{4}-\d{2}-\d{2}T/.test(payload.osm3s?.timestamp_osm_base ?? "");
}
