import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMeta, setMeta } from "@/lib/db/indexedDb";
import {
  clearGeolocationGranted,
  isGeolocationMarkedGranted,
  isGeolocationMarkedGrantedAsync,
  markGeolocationGranted,
} from "@/lib/geolocationStorage";

const DB_KEY = "preset:fuelmap.geoGranted";

describe("geolocationStorage", () => {
  beforeEach(async () => {
    localStorage.clear();
    await setMeta(DB_KEY, undefined);
  });

  it("mirrors the acceptance marker to IndexedDB", async () => {
    markGeolocationGranted();

    expect(isGeolocationMarkedGranted()).toBe(true);
    await vi.waitFor(async () => expect(await getMeta(DB_KEY)).toBe(true));
  });

  it("reads the marker from IndexedDB after a localStorage cleanup", async () => {
    await setMeta(DB_KEY, true);

    expect(isGeolocationMarkedGranted()).toBe(false);
    expect(await isGeolocationMarkedGrantedAsync()).toBe(true);
  });

  it("clears both markers", async () => {
    markGeolocationGranted();
    await vi.waitFor(async () => expect(await getMeta(DB_KEY)).toBe(true));

    clearGeolocationGranted();

    expect(isGeolocationMarkedGranted()).toBe(false);
    await vi.waitFor(async () =>
      expect(await isGeolocationMarkedGrantedAsync()).toBe(false),
    );
  });
});
