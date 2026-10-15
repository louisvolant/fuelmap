import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CountryCode, NormalizedStation } from "@/countries/types";
import type { BrandResolution } from "@/lib/brandResolutions";

/** A locally saved favorite station. No account, no server: purely on-device. */
export interface FavoriteRecord {
  /** Station id, e.g. `"FR:89100001"`. */
  id: string;
  country: CountryCode;
  /** Epoch milliseconds. */
  addedAt: number;
}

interface MetaRecord {
  key: string;
  value: unknown;
}

interface FuelMapDB extends DBSchema {
  stations: {
    key: string;
    value: NormalizedStation;
    indexes: { country: string };
  };
  favorites: {
    key: string;
    value: FavoriteRecord;
  };
  meta: {
    key: string;
    value: MetaRecord;
  };
  brandResolutions: {
    key: string;
    value: BrandResolution;
  };
}

const DB_NAME = "fuelmap";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<FuelMapDB>> | null = null;

/** Lazily open (and cache) the IndexedDB connection. */
export function getDb(): Promise<IDBPDatabase<FuelMapDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FuelMapDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("stations")) {
          const stations = db.createObjectStore("stations", { keyPath: "id" });
          stations.createIndex("country", "country");
        }
        if (!db.objectStoreNames.contains("favorites")) {
          db.createObjectStore("favorites", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
        // Long-lived brand overlay: stationId -> resolved brand (see brandResolutions).
        if (!db.objectStoreNames.contains("brandResolutions")) {
          db.createObjectStore("brandResolutions", { keyPath: "stationId" });
        }
      },
    });
  }
  return dbPromise;
}

/** Last successful synchronization timestamp per country. */
export function lastSyncKey(country: CountryCode): string {
  return `lastSync:${country}`;
}

/** Replace all cached stations of a country with the provided list. */
export async function saveStations(
  country: CountryCode,
  stations: NormalizedStation[],
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("stations", "readwrite");

  let cursor = await tx.store.index("country").openCursor(country);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await Promise.all(stations.map((station) => tx.store.put(station)));
  await tx.done;
}

export async function getStationsByCountry(
  country: CountryCode,
): Promise<NormalizedStation[]> {
  const db = await getDb();
  return db.getAllFromIndex("stations", "country", country);
}

export async function getStation(id: string): Promise<NormalizedStation | undefined> {
  const db = await getDb();
  return db.get("stations", id);
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const record = await db.get("meta", key);
  return record?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put("meta", { key, value });
}

export async function getFavorites(): Promise<FavoriteRecord[]> {
  const db = await getDb();
  return db.getAll("favorites");
}

export async function isFavorite(id: string): Promise<boolean> {
  const db = await getDb();
  const record = await db.get("favorites", id);
  return record !== undefined;
}

export async function addFavorite(
  id: string,
  country: CountryCode,
): Promise<FavoriteRecord> {
  const db = await getDb();
  const record: FavoriteRecord = { id, country, addedAt: Date.now() };
  await db.put("favorites", record);
  return record;
}

export async function removeFavorite(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("favorites", id);
}

/** Persist resolved brands so logos render instantly on the next visit. */
export async function saveBrandResolutions(
  resolutions: BrandResolution[],
): Promise<void> {
  if (resolutions.length === 0) return;
  const db = await getDb();
  const tx = db.transaction("brandResolutions", "readwrite");
  await Promise.all(resolutions.map((resolution) => tx.store.put(resolution)));
  await tx.done;
}

/** Read every cached brand resolution (filtered for freshness by callers). */
export async function getAllBrandResolutions(): Promise<BrandResolution[]> {
  const db = await getDb();
  return db.getAll("brandResolutions");
}

/** Only used by tests to close the cached connection. */
export async function closeDb(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.close();
  dbPromise = null;
}
