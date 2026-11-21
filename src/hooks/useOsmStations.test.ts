import { describe, expect, it } from "vitest";
import { osmBboxKey } from "@/hooks/useOsmStations";
import { quantizeBounds } from "@/lib/brandResolutions";

describe("osmBboxKey", () => {
  it("keeps the same key across micro-pans and changes it across tiles", () => {
    const first = osmBboxKey([2.351, 48.851, 2.449, 48.949]);
    expect(osmBboxKey([2.352, 48.852, 2.45, 48.95])).toBe(first);
    expect(osmBboxKey([3.0, 48.851, 3.1, 48.949])).not.toBe(first);
  });

  it("aligns osmBboxKey with outward quantizeBounds across micro-pans in a 0.05-degree cell", () => {
    const firstBounds: [number, number, number, number] = [2.461, 48.812, 2.538, 48.887];
    const pannedBounds: [number, number, number, number] = [2.489, 48.839, 2.512, 48.864];

    const quantizedFirst = quantizeBounds(firstBounds);
    const quantizedPanned = quantizeBounds(pannedBounds);

    expect(quantizedFirst).toEqual([2.45, 48.8, 2.55, 48.9]);
    expect(quantizedPanned).toEqual(quantizedFirst);
    expect(osmBboxKey(firstBounds)).toBe(quantizedFirst.map((v) => v.toFixed(2)).join(","));
    expect(osmBboxKey(pannedBounds)).toBe(osmBboxKey(firstBounds));
  });
});
