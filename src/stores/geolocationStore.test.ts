import { beforeEach, describe, expect, it, vi } from "vitest";
import { setMeta } from "@/lib/db/indexedDb";
import { useGeolocationStore } from "@/stores/geolocationStore";

function stubGeolocation(
  implementation: (success: PositionCallback, error?: PositionErrorCallback) => void,
) {
  const getCurrentPosition = vi.fn(implementation);
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
  return getCurrentPosition;
}

function stubPermission(state: string | "unsupported") {
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value:
      state === "unsupported" ? undefined : { query: vi.fn(async () => ({ state })) },
  });
}

describe("geolocationStore", () => {
  beforeEach(async () => {
    localStorage.clear();
    await setMeta("preset:fuelmap.geoGranted", undefined);
    useGeolocationStore.setState({
      position: null,
      accuracy: null,
      status: "idle",
    });
  });

  it("stores the position on success", async () => {
    stubPermission("granted");
    stubGeolocation((success) =>
      success({
        coords: { longitude: 2.3522, latitude: 48.8566, accuracy: 12 },
      } as GeolocationPosition),
    );

    useGeolocationStore.getState().locate();

    await vi.waitFor(() => expect(useGeolocationStore.getState().status).toBe("granted"));
    expect(useGeolocationStore.getState().position).toEqual([2.3522, 48.8566]);
    expect(localStorage.getItem("fuelmap.lastPosition")).toBe("2.3522,48.8566");
  });

  it("flags a denied permission", async () => {
    stubPermission("granted");
    stubGeolocation((_success, error) =>
      error?.({ code: 1 } as GeolocationPositionError),
    );

    useGeolocationStore.getState().locate();

    await vi.waitFor(() => expect(useGeolocationStore.getState().status).toBe("denied"));
    expect(useGeolocationStore.getState().position).toBeNull();
    expect(localStorage.getItem("fuelmap.geoGranted")).toBeNull();
  });

  it("reuses the remembered fix instead of prompting again", async () => {
    localStorage.setItem("fuelmap.lastPosition", "2.3522,48.8566");
    stubPermission("prompt");
    const getCurrentPosition = stubGeolocation(() => {});

    useGeolocationStore.getState().locate();

    await vi.waitFor(() => expect(useGeolocationStore.getState().status).toBe("granted"));
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(useGeolocationStore.getState().position).toEqual([2.3522, 48.8566]);
  });

  it("refreshes silently when the permission is explicitly granted", async () => {
    localStorage.setItem("fuelmap.lastPosition", "2.0,48.0");
    stubPermission("granted");
    const getCurrentPosition = stubGeolocation((success) =>
      success({
        coords: { longitude: 2.3522, latitude: 48.8566, accuracy: 12 },
      } as GeolocationPosition),
    );

    useGeolocationStore.getState().locate();

    await vi.waitFor(() =>
      expect(useGeolocationStore.getState().position).toEqual([2.3522, 48.8566]),
    );
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });
});
