/**
 * Small localStorage helpers around geolocation.
 *
 * The last known position is remembered so the app can open around the user on
 * every reload **without** waiting for a GPS fix or triggering a prompt.
 */

const POSITION_KEY = "fuelmap.lastPosition";
const GRANTED_KEY = "fuelmap.geoGranted";

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
}

export function isGeolocationMarkedGranted(): boolean {
  try {
    return localStorage.getItem(GRANTED_KEY) === "1";
  } catch {
    return false;
  }
}
