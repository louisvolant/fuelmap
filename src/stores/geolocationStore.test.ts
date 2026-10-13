import { describe, expect, it, vi, beforeEach } from "vitest";
import { useGeolocationStore } from "@/stores/geolocationStore";

function mockGeolocation(
  implementation: (
    success: PositionCallback,
    error?: PositionErrorCallback,
  ) => void,
) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: vi.fn(implementation) },
  });
}

describe("geolocationStore", () => {
  beforeEach(() => {
    useGeolocationStore.setState({
      position: null,
      accuracy: null,
      status: "idle",
    });
  });

  it("stores the position on success", () => {
    mockGeolocation((success) =>
      success({
        coords: { longitude: 2.3522, latitude: 48.8566, accuracy: 12 },
      } as GeolocationPosition),
    );

    useGeolocationStore.getState().locate();

    expect(useGeolocationStore.getState().position).toEqual([2.3522, 48.8566]);
    expect(useGeolocationStore.getState().status).toBe("granted");
  });

  it("flags a denied permission", () => {
    mockGeolocation((_success, error) =>
      error?.({ code: 1 } as GeolocationPositionError),
    );

    useGeolocationStore.getState().locate();

    expect(useGeolocationStore.getState().status).toBe("denied");
    expect(useGeolocationStore.getState().position).toBeNull();
  });
});
