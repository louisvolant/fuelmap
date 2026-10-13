import type {
  FuelDataSource,
  NormalizedFuelPrice,
  NormalizedStation,
} from "../types";
import { SPANISH_FUELS } from "./fuels";

const ENDPOINT =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

const SPANISH_ENDPOINT =
  import.meta.env.VITE_ES_FUEL_API_URL?.toString() ?? ENDPOINT;

const CURRENCY = "EUR";

/** Raw record shape returned by the Spanish Ministerio API. */
export interface RawEsStation {
  IDEESS: string;
  Rótulo?: string;
  Dirección?: string;
  "C.P."?: string;
  Municipio?: string;
  Latitud?: string;
  "Longitud (WGS84)"?: string;
  Horario?: string;
  [key: string]: unknown;
}

interface RawEsResponse {
  Fecha: string;
  ListaEESSPrecio: RawEsStation[];
}

/** Spanish numbers use a comma as the decimal separator. */
function parseSpanishNumber(raw: unknown): number | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) ? value : undefined;
}

function normalizeUpdatedAt(fecha: string | undefined): string | undefined {
  if (!fecha) return undefined;
  // Format: "13/10/2026 20:26:51" (Europe/Madrid local time).
  const match = fecha.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2}:\d{2})$/,
  );
  if (!match) return undefined;
  const [, day, month, year, time] = match;
  return `${year}-${month}-${day}T${time}+02:00`;
}

/** Map every priced fuel column of a Spanish record. */
export function normalizeEsFuels(
  raw: RawEsStation,
  updatedAt: string | undefined,
): NormalizedFuelPrice[] {
  const fuels: NormalizedFuelPrice[] = [];

  for (const definition of SPANISH_FUELS) {
    const column = `Precio ${definition.aliases[0]}`;
    const price = parseSpanishNumber(raw[column]);
    if (price === undefined) continue;

    fuels.push({
      fuelId: definition.id,
      price,
      currency: CURRENCY,
      updatedAt,
      available: true,
    });
  }

  return fuels;
}

/** Normalize a single Spanish record into a station. */
export function normalizeEsStation(
  raw: RawEsStation,
  updatedAt?: string,
): NormalizedStation | null {
  const lat = parseSpanishNumber(raw.Latitud);
  const lon = parseSpanishNumber(raw["Longitud (WGS84)"]);
  if (lat === undefined || lon === undefined) return null;

  return {
    id: `ES:${raw.IDEESS}`,
    country: "ES",
    lat,
    lon,
    address: raw.Dirección,
    city: raw.Municipio,
    postalCode: raw["C.P."],
    brand: raw.Rótulo || undefined,
    isHighway: false,
    fuels: normalizeEsFuels(raw, updatedAt),
    services: [],
    // The opening-hours field reports "24H" for automated around-the-clock sites.
    automat24h: typeof raw.Horario === "string" && raw.Horario.includes("24H"),
    sourceId: raw.IDEESS,
  };
}

export const SPAIN_DATA_SOURCE: FuelDataSource = {
  id: "es-minetur",
  country: "ES",
  kind: "bulk",
  refreshIntervalMs: 30 * 60 * 1000,
  attribution:
    "Precios de carburantes — Ministerio para la Transición Ecológica (geoportalgasolineras.es)",
  async fetchStations({ signal } = {}) {
    const response = await fetch(SPANISH_ENDPOINT, { signal });
    if (!response.ok) {
      throw new Error(`Spanish fuel API failed with status ${response.status}`);
    }
    const payload = (await response.json()) as RawEsResponse;
    const updatedAt = normalizeUpdatedAt(payload.Fecha);
    return payload.ListaEESSPrecio.map((raw) =>
      normalizeEsStation(raw, updatedAt),
    ).filter((station): station is NormalizedStation => station !== null);
  },
};
