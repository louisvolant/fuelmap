import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { CountryCode } from "@/countries/types";
import { boundingBox } from "@/lib/geo";
import { fetchGeoIp } from "@/lib/geoIp";
import { queryGeolocationPermission } from "@/lib/geolocation";
import {
  isGeolocationMarkedGrantedAsync,
  markGeolocationGranted,
  readLastPosition,
  writeLastPosition,
} from "@/lib/geolocationStorage";
import { useGeolocationStore } from "@/stores/geolocationStore";

const INITIAL_RADIUS_M = 5_000;
const MAX_INITIAL_ZOOM = 13;
const VISITED_KEY = "fuelmap.visited";

const SUPPORTED_COUNTRIES: CountryCode[] = [
  "FR",
  "BE",
  "LU",
  "DE",
  "CH",
  "IT",
  "ES",
];

export interface InitialCamera {
  center: [number, number];
  country: CountryCode | null;
  source: "geolocation" | "ip";
}

function getCurrentPosition(): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve([position.coords.longitude, position.coords.latitude]),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 300_000 },
    );
  });
}

/** True when the app has never been opened on this device. */
function isFirstVisit(): boolean {
  try {
    return localStorage.getItem(VISITED_KEY) === null;
  } catch {
    return false;
  }
}

function markVisited(): void {
  try {
    localStorage.setItem(VISITED_KEY, "1");
  } catch {
    // Ignore.
  }
}

/**
 * Resolve where the app should open, in order of preference:
 * 1. the last known position (instant, no prompt, survives reloads),
 * 2. a fresh geolocation fix when the browser will not prompt,
 * 3. the IP-based location,
 * 4. `null` (country default).
 */
export async function resolveInitialCamera(): Promise<InitialCamera | null> {
  const remembered = readLastPosition();
  if (remembered) {
    return { center: remembered, country: null, source: "geolocation" };
  }

  const permission = await queryGeolocationPermission();
  const mayLocate =
    permission === "granted" ||
    (await isGeolocationMarkedGrantedAsync()) ||
    // No Permissions API (Safari): the browser resolves silently if the user
    // already allowed this site, and only prompts otherwise.
    permission === "unsupported";

  if (mayLocate) {
    const position = await getCurrentPosition();
    if (position) {
      writeLastPosition(position);
      markGeolocationGranted();
      return { center: position, country: null, source: "geolocation" };
    }
  }

  try {
    const geo = await fetchGeoIp();
    if (Number.isFinite(geo.lat) && Number.isFinite(geo.lon)) {
      const country =
        SUPPORTED_COUNTRIES.find((code) => code === geo.country) ?? null;
      return {
        center: [geo.lon as number, geo.lat as number],
        country,
        source: "ip",
      };
    }
  } catch {
    // Network / parse failure: keep the country default.
  }

  return null;
}

/**
 * Fit the map around the user on first open. Runs once and never overrides the
 * camera afterwards.
 */
export function useInitialView(
  map: MapLibreMap | null,
  country: CountryCode,
  onCountryChange: (code: CountryCode) => void,
): void {
  const applied = useRef(false);
  const countryChangeRef = useRef(onCountryChange);

  useEffect(() => {
    countryChangeRef.current = onCountryChange;
  }, [onCountryChange]);

  useEffect(() => {
    if (!map || applied.current) return;
    applied.current = true;
    let cancelled = false;

    void (async () => {
      const camera = await resolveInitialCamera();
      if (cancelled || !camera) return;

      if (camera.source === "geolocation") {
        useGeolocationStore.setState({
          position: camera.center,
          status: "granted",
        });
      }

      if (camera.country && camera.country !== country && isFirstVisit()) {
        countryChangeRef.current(camera.country);
      }
      markVisited();

      map.fitBounds(boundingBox(camera.center, INITIAL_RADIUS_M), {
        maxZoom: MAX_INITIAL_ZOOM,
        duration: 0,
        padding: 40,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [map, country]);
}
