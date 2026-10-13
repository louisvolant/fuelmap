import type {
  FuelDataSource,
  NormalizedFuelPrice,
  NormalizedStation,
  OpeningHours,
  OpeningHoursDay,
  OpeningHoursPeriod,
  ShortageType,
} from "../types";
import { fetchAllOdsRecords } from "@/lib/api/odsClient";
import { FRENCH_FUELS } from "./fuels";

const DATASET_URL =
  "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";

/** Allow overriding the endpoint at build/deploy time (e.g. Cloudflare Worker proxy). */
const FRANCE_ENDPOINT =
  import.meta.env.VITE_FR_FUEL_API_URL?.toString() ?? DATASET_URL;

const CURRENCY = "EUR";

/**
 * Raw record shape returned by the DGCCRF dataset.
 *
 * WARNING: `latitude` / `longitude` are integers multiplied by 100 000
 * (e.g. `4818300` -> `48.183`). `geom` already holds decimal degrees and is the
 * only coordinate source FuelMap trusts.
 */
export interface RawFrRecord {
  id: number;
  geom?: { lon: number; lat: number };
  latitude?: string;
  longitude?: string;
  cp?: string;
  pop?: string;
  adresse?: string;
  ville?: string;
  services?: string;
  horaires?: string;
  services_service?: string[];
  horaires_automate_24_24?: string;
  [key: string]: unknown;
}

function parseJson<T>(raw: string | undefined): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function normalizeTime(value: string): string {
  return value.replace(".", ":").trim();
}

/** Best-effort extraction of opening periods from the FR `horaires` payload. */
function parsePeriods(day: Record<string, unknown>): OpeningHoursPeriod[] {
  const ouverture = day["@ouverture"];
  if (!ouverture) return [];

  const entries = Array.isArray(ouverture) ? ouverture : [ouverture];
  const periods: OpeningHoursPeriod[] = [];

  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null) continue;
    const horaire = (entry as Record<string, unknown>)["@horaire"];
    const slots = Array.isArray(horaire) ? horaire : horaire ? [horaire] : [];
    for (const slot of slots) {
      if (typeof slot !== "object" || slot === null) continue;
      const record = slot as Record<string, unknown>;
      const from = record["@debut"];
      const to = record["@fin"];
      if (typeof from === "string" && typeof to === "string") {
        periods.push({ from: normalizeTime(from), to: normalizeTime(to) });
      }
    }
  }

  return periods;
}

export function parseOpeningHours(raw: string | undefined): OpeningHours | undefined {
  const parsed = parseJson<{ jour?: unknown }>(raw);
  if (!parsed?.jour) return undefined;

  const days = Array.isArray(parsed.jour) ? parsed.jour : [parsed.jour];
  const normalizedDays: OpeningHoursDay[] = [];

  for (const day of days) {
    if (typeof day !== "object" || day === null) continue;
    const record = day as Record<string, unknown>;
    const name = record["@nom"];
    if (typeof name !== "string") continue;
    const closed = Boolean(record["@ferme"]);
    normalizedDays.push({
      day: name,
      closed,
      periods: closed ? [] : parsePeriods(record),
    });
  }

  return normalizedDays.length > 0 ? { days: normalizedDays } : undefined;
}

const SHORTAGE_TYPES: Record<string, ShortageType> = {
  temporaire: "temporary",
  definitive: "definitive",
};

export function normalizeFuels(raw: RawFrRecord): NormalizedFuelPrice[] {
  const fuels: NormalizedFuelPrice[] = [];

  for (const definition of FRENCH_FUELS) {
    const price = raw[`${definition.id}_prix`];
    const updatedAt = raw[`${definition.id}_maj`];
    const ruptureType = raw[`${definition.id}_rupture_type`];
    const ruptureSince = raw[`${definition.id}_rupture_debut`];

    const hasPrice = typeof price === "number";
    const shortage =
      typeof ruptureType === "string" && SHORTAGE_TYPES[ruptureType]
        ? {
            type: SHORTAGE_TYPES[ruptureType],
            since: typeof ruptureSince === "string" ? safeIso(ruptureSince) : undefined,
          }
        : undefined;

    // Skip fuels the source knows nothing about (no price and no shortage).
    if (!hasPrice && !shortage) continue;

    fuels.push({
      fuelId: definition.id,
      price: hasPrice ? price : undefined,
      currency: CURRENCY,
      updatedAt: typeof updatedAt === "string" ? safeIso(updatedAt) : undefined,
      shortage,
      available: hasPrice,
    });
  }

  return fuels;
}

/** Convert an ISO-ish string to a normalized ISO string, or undefined. */
function safeIso(value: string): string | undefined {
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function extractServices(raw: RawFrRecord): string[] {
  if (Array.isArray(raw.services_service)) return raw.services_service;
  const parsed = parseJson<{ service?: string | string[] }>(raw.services);
  if (!parsed?.service) return [];
  return Array.isArray(parsed.service) ? parsed.service : [parsed.service];
}

/** Resolve coordinates, preferring `geom` over the ×100 000 legacy fields. */
function resolveCoordinates(raw: RawFrRecord): { lat: number; lon: number } | null {
  if (raw.geom && Number.isFinite(raw.geom.lat) && Number.isFinite(raw.geom.lon)) {
    return { lat: raw.geom.lat, lon: raw.geom.lon };
  }
  const lat = Number(raw.latitude);
  const lon = Number(raw.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0) {
    return { lat: lat / 100000, lon: lon / 100000 };
  }
  return null;
}

/** Normalize a single DGCCRF record. Returns `null` when it cannot be placed. */
export function normalizeFrStation(raw: RawFrRecord): NormalizedStation | null {
  const coordinates = resolveCoordinates(raw);
  if (!coordinates) return null;

  return {
    id: `FR:${raw.id}`,
    country: "FR",
    lat: coordinates.lat,
    lon: coordinates.lon,
    address: raw.adresse,
    city: raw.ville,
    postalCode: raw.cp,
    isHighway: raw.pop === "A",
    fuels: normalizeFuels(raw),
    services: extractServices(raw),
    openingHours: parseOpeningHours(raw.horaires),
    automat24h: raw.horaires_automate_24_24 === "Oui",
    sourceId: String(raw.id),
  };
}

export const FRANCE_DATA_SOURCE: FuelDataSource = {
  id: "fr-dgccrf",
  country: "FR",
  refreshIntervalMs: 10 * 60 * 1000,
  attribution:
    "Prix des carburants — DGCCRF / data.economie.gouv.fr (Licence Ouverte 2.0)",
  async fetchStations({ signal } = {}) {
    const records = await fetchAllOdsRecords<RawFrRecord>(FRANCE_ENDPOINT, {
      signal,
      orderBy: "id",
    });
    return records
      .map(normalizeFrStation)
      .filter((station): station is NormalizedStation => station !== null);
  },
};
