import { describe, expect, it } from "vitest";
import {
  applyBrandResolutions,
  BRAND_RESOLVER_VERSION,
  collectNewResolutions,
  isResolutionFresh,
  stableBboxKey,
  type BrandResolution,
} from "@/lib/brandResolutions";

function makeResolution(overrides: Partial<BrandResolution> = {}): BrandResolution {
  return {
    stationId: "FR:1",
    brand: "TotalEnergies",
    lat: 48.85,
    lon: 2.35,
    resolvedAt: Date.now(),
    resolverVersion: BRAND_RESOLVER_VERSION,
    ...overrides,
  };
}

describe("brandResolutions", () => {
  it("accepts fresh resolutions and rejects expired or versioned-out ones", () => {
    expect(isResolutionFresh(makeResolution())).toBe(true);
    expect(
      isResolutionFresh(
        makeResolution({ resolvedAt: Date.now() - 100 * 24 * 60 * 60 * 1000 }),
      ),
    ).toBe(false);
    expect(isResolutionFresh(makeResolution({ resolverVersion: "v0" }))).toBe(
      false,
    );
  });

  it("applies cached brands to unbranded stations only", () => {
    const stations = [
      { id: "FR:1", brand: undefined, lat: 48.85, lon: 2.35 },
      { id: "FR:2", brand: "Esso", lat: 48.86, lon: 2.36 },
      { id: "FR:3", brand: undefined, lat: 48.87, lon: 2.37 },
    ];
    const resolutions = new Map([
      ["FR:1", makeResolution({ stationId: "FR:1", brand: "TotalEnergies" })],
      ["FR:2", makeResolution({ stationId: "FR:2", brand: "Shell" })],
    ]);
    const result = applyBrandResolutions(stations, resolutions);
    expect(result[0].brand).toBe("TotalEnergies");
    // Never overwrites an existing brand.
    expect(result[1].brand).toBe("Esso");
    expect(result[2].brand).toBeUndefined();
  });

  it("ignores resolutions for stations that moved since resolution", () => {
    const stations = [{ id: "FR:1", brand: undefined, lat: 48.9, lon: 2.4 }];
    const resolutions = new Map([["FR:1", makeResolution()]]);
    expect(applyBrandResolutions(stations, resolutions)[0].brand).toBeUndefined();
  });

  it("collects only newly branded stations for persistence", () => {
    const before = [{ id: "FR:1", brand: undefined, lat: 48.85, lon: 2.35 }];
    const after = [{ id: "FR:1", brand: "TotalEnergies", lat: 48.85, lon: 2.35 }];
    const collected = collectNewResolutions(before, after);
    expect(collected).toHaveLength(1);
    expect(collected[0]).toMatchObject({
      stationId: "FR:1",
      brand: "TotalEnergies",
      resolverVersion: BRAND_RESOLVER_VERSION,
    });
  });

  it("produces a stable bbox key across micro-pans", () => {
    const first = stableBboxKey([2.351, 48.851, 2.449, 48.949]);
    const nudged = stableBboxKey([2.352, 48.852, 2.45, 48.95]);
    expect(nudged).toBe(first);
    const far = stableBboxKey([3.0, 48.851, 3.1, 48.949]);
    expect(far).not.toBe(first);
  });
});
