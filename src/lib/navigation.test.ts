import { describe, expect, it } from "vitest";
import { geoUri, navigationOptions } from "@/lib/navigation";

const point = { lat: 48.8566, lon: 2.3522 };

describe("navigationOptions", () => {
  it("returns Waze, Google Maps and Apple Maps links", () => {
    const options = navigationOptions(point);
    expect(options.map((option) => option.id)).toEqual([
      "waze",
      "googleMaps",
      "appleMaps",
    ]);
  });

  it("includes the coordinates in every link", () => {
    for (const option of navigationOptions(point)) {
      expect(option.href).toContain("48.856600");
      expect(option.href).toContain("2.352200");
    }
  });

  it("builds the expected deep links", () => {
    const [waze, google, apple] = navigationOptions(point);
    expect(waze.href).toBe(
      "https://waze.com/ul?ll=48.856600,2.352200&navigate=yes",
    );
    expect(google.href).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=48.856600,2.352200&travelmode=driving",
    );
    expect(apple.href).toBe(
      "https://maps.apple.com/?daddr=48.856600,2.352200&dirflg=d",
    );
  });
});

describe("geoUri", () => {
  it("builds a geo: URI", () => {
    expect(geoUri(point)).toBe("geo:48.856600,2.352200");
  });
});
