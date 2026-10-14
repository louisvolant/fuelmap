import { create } from "zustand";
import {
  markGeolocationGranted,
  writeLastPosition,
} from "@/lib/geolocationStorage";

export type GeolocationStatus =
  | "idle"
  | "locating"
  | "granted"
  | "denied"
  | "error";

/** `GeolocationPositionError.PERMISSION_DENIED`, kept as a literal for safety. */
const PERMISSION_DENIED = 1;

interface GeolocationState {
  /** User position as `[lon, lat]`, or `null` when unknown. */
  position: [number, number] | null;
  /** Accuracy in meters, when known. */
  accuracy: number | null;
  status: GeolocationStatus;
  /** Request the user's current position (one-shot). */
  locate: () => void;
}

export const useGeolocationStore = create<GeolocationState>((set) => ({
  position: null,
  accuracy: null,
  status: "idle",

  locate: () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      set({ status: "error" });
      return;
    }

    set({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (result) => {
        const position: [number, number] = [
          result.coords.longitude,
          result.coords.latitude,
        ];
        // Remember it so the app can open around the user on the next reload.
        writeLastPosition(position);
        markGeolocationGranted();
        set({
          position,
          accuracy: result.coords.accuracy,
          status: "granted",
        });
      },
      (error) =>
        set({
          status: error.code === PERMISSION_DENIED ? "denied" : "error",
        }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  },
}));
