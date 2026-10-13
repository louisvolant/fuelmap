import { describe, expect, it } from "vitest";
import { boundingBox, distanceMeters } from "@/lib/geo";

describe("distanceMeters", () => {
  it("returns zero for the same point", () => {
    expect(distanceMeters([2.35, 48.85], [2.35, 48.85])).toBe(0);
  });

  it("computes a plausible distance between Paris and Lyon", () => {
    const paris: [number, number] = [2.3522, 48.8566];
    const lyon: [number, number] = [4.8357, 45.764];
    const distance = distanceMeters(paris, lyon);
    // Real great-circle distance is ~392 km.
    expect(distance).toBeGreaterThan(380_000);
    expect(distance).toBeLessThan(405_000);
  });
});

describe("boundingBox", () => {
  it("produces a box that contains the center and is symmetric", () => {
    const [west, south, east, north] = boundingBox([2.35, 48.85], 1000);
    expect(west).toBeLessThan(2.35);
    expect(east).toBeGreaterThan(2.35);
    expect(south).toBeLessThan(48.85);
    expect(north).toBeGreaterThan(48.85);
    expect(2.35 - west).toBeCloseTo(east - 2.35, 10);
    expect(48.85 - south).toBeCloseTo(north - 48.85, 10);
  });
});
