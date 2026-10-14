import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveInitialCamera } from "@/hooks/useInitialView";

function stubGeolocation(position: [number, number] | null) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: vi.fn((success: PositionCallback) => {
        if (!position) return; // Never resolves (simulates a denial).
        success({
          coords: { longitude: position[0], latitude: position[1], accuracy: 10 },
        } as GeolocationPosition);
      }),
    },
  });
}

function stubPermission(state: string | "unsupported") {
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value:
      state === "unsupported"
        ? undefined
        : { query: vi.fn(async () => ({ state })) },
  });
}

function stubGeoApi(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}

describe("resolveInitialCamera", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the remembered position without asking again", async () => {
    localStorage.setItem("fuelmap.lastPosition", "2.3522,48.8566");
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    const camera = await resolveInitialCamera();
    expect(camera).toEqual({
      center: [2.3522, 48.8566],
      country: null,
      source: "geolocation",
    });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("locates when permission is already granted and remembers it", async () => {
    stubPermission("granted");
    stubGeolocation([2.3522, 48.8566]);

    const camera = await resolveInitialCamera();
    expect(camera?.source).toBe("geolocation");
    expect(camera?.center).toEqual([2.3522, 48.8566]);
    expect(localStorage.getItem("fuelmap.lastPosition")).toBe("2.3522,48.8566");
  });

  it("falls back to the IP location when geolocation is not usable", async () => {
    stubPermission("denied");
    stubGeolocation(null);
    stubGeoApi({ country: "ES", city: "Madrid", lat: 40.4168, lon: -3.7038 });

    const camera = await resolveInitialCamera();
    expect(camera).toEqual({
      center: [-3.7038, 40.4168],
      country: "ES",
      source: "ip",
    });
  });

  it("returns null when nothing is available", async () => {
    stubPermission("denied");
    stubGeolocation(null);
    stubGeoApi({ country: null, city: null, lat: null, lon: null });

    expect(await resolveInitialCamera()).toBeNull();
  });
});
