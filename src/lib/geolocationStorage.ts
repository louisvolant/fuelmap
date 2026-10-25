/**
 * Small storage helpers around geolocation.
 *
 * The last known position is remembered so the app can open around the user on
 * every reload **without** waiting for a GPS fix or triggering a prompt. The
 * acceptance itself is also mirrored to IndexedDB: installed PWAs are more
 * likely to keep IndexedDB than localStorage, and the locate button must never
 * ask again for a permission the user already granted.
 */
import { getMeta, setMeta } from "@/lib/db/indexedDb";

const POSITION_KEY = "fuelmap.lastPosition";
const GRANTED_KEY = "fuelmap.geoGranted";
const GRANTED_DB_KEY = "preset:fuelmap.geoGranted";

export function readLastPosition(): [number, number] | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const [lon, lat] = raw.split(",").map(Number);
    return Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null;
  } catch {
    return null;
  }
}

export function writeLastPosition(position: [number, number]): void {
  try {
    localStorage.setItem(POSITION_KEY, `${position[0]},${position[1]}`);
  } catch {
    // Ignore storage errors (private mode).
  }
}

export function markGeolocationGranted(): void {
  try {
    localStorage.setItem(GRANTED_KEY, "1");
  } catch {
    // Ignore storage errors.
  }
  void setMeta(GRANTED_DB_KEY, true).catch(() => {
    // The localStorage marker above remains the fallback.
  });
}

export function clearGeolocationGranted(): void {
  try {
    localStorage.removeItem(GRANTED_KEY);
  } catch {
    // Ignore storage errors.
  }
  void setMeta(GRANTED_DB_KEY, false).catch(() => {
    // Ignore storage errors.
  });
}

export function isGeolocationMarkedGranted(): boolean {
  try {
    return localStorage.getItem(GRANTED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Durable acceptance marker: localStorage first (instant), then IndexedDB
 * after an installed-PWA restart or a localStorage cleanup.
 */
export async function isGeolocationMarkedGrantedAsync(): Promise<boolean> {
  if (isGeolocationMarkedGranted()) return true;
  try {
    return (await getMeta<boolean>(GRANTED_DB_KEY)) === true;
  } catch {
    return false;
  }
}
