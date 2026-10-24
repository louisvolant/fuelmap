import type { Feature, FeatureCollection, Point } from "geojson";

/** Properties carried by a fixed speed camera. */
export interface RadarProperties {
  /** Official radar number, e.g. `12001`. */
  id: string;
  /** Official type code (`ETF`, `ETD`, `ETVM`, `ETFR`…). */
  type: string;
  /** Maximum allowed speed in km/h, or `null` for non-speed cameras. */
  maxSpeedKmh: number | null;
  /** Commissioning date as `YYYY-MM-DD`, or `null` when unknown. */
  commissionedAt: string | null;
}

export type RadarFeature = Feature<Point, RadarProperties>;
export type RadarFeatureCollection = FeatureCollection<Point, RadarProperties>;

/** i18n key for each official radar type, with a generic fallback. */
export function radarTypeLabelKey(type: string): string {
  const key = type.trim().toLowerCase();
  if (
    key === "etf" ||
    key === "etd" ||
    key === "ett" ||
    key === "etu" ||
    key === "etvm" ||
    key === "etfr" ||
    key === "etpn"
  ) {
    return `radars.types.${key}`;
  }
  return "radars.types.other";
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseCoordinate(value: string): number | null {
  const number = Number(value.trim());
  return Number.isFinite(number) ? number : null;
}

/** Parse the French `DD/MM/YYYY[ HH:mm]` date into an ISO date (`YYYY-MM-DD`). */
function parseCommissionedAt(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+\d{2}:\d{2})?$/.exec(value.trim());
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function parseMaxSpeed(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === "NA") return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

/**
 * Parse the official French fixed-radar CSV (Ministry of the Interior).
 *
 * The source is published as Windows-1252, semicolon-separated, with a BOM and
 * a header whose columns carry trailing spaces. Decoding is the caller's job so
 * this stays a pure function, easy to test with the real file.
 */
export function parseFrenchRadarsCsv(csv: string): RadarFeatureCollection {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/);
  const header = (lines.shift() ?? "").split(";").map(normalizeHeader);

  const columns = {
    id: header.indexOf("numero de radar"),
    type: header.indexOf("type de radar"),
    commissionedAt: header.indexOf("date de mise en service"),
    maxSpeed: header.indexOf("vma"),
    lat: header.indexOf("latitude"),
    lon: header.indexOf("longitude"),
  };
  if (Object.values(columns).some((index) => index < 0)) {
    throw new Error("Unexpected fixed-radar CSV header");
  }

  const features: RadarFeature[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = line.split(";");
    const id = cells[columns.id]?.trim();
    const lat = parseCoordinate(cells[columns.lat] ?? "");
    const lon = parseCoordinate(cells[columns.lon] ?? "");
    if (!id || lat === null || lon === null) continue;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

    features.push({
      type: "Feature",
      id,
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        id,
        type: (cells[columns.type] ?? "").trim().toUpperCase(),
        maxSpeedKmh: parseMaxSpeed(cells[columns.maxSpeed] ?? ""),
        commissionedAt: parseCommissionedAt(cells[columns.commissionedAt] ?? ""),
      },
    });
  }

  return { type: "FeatureCollection", features };
}

/** Format a radar commissioning date for the popup. */
export function formatRadarDate(value: string | null, locale: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}
