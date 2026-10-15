import { describe, expect, it } from "vitest";
import { isTrustworthyOverpassAnswer } from "@/lib/overpass";

describe("isTrustworthyOverpassAnswer", () => {
  const element = { type: "node", id: 1, lat: 48.8, lon: 2.3 };

  it("accepts a non-empty answer on its own", () => {
    expect(isTrustworthyOverpassAnswer({ elements: [element] })).toBe(true);
  });

  it("accepts an empty answer only with a real Overpass envelope", () => {
    expect(
      isTrustworthyOverpassAnswer({
        elements: [],
        osm3s: { timestamp_osm_base: "2026-10-15T09:00:00Z" },
      }),
    ).toBe(true);
  });

  it("rejects the empty answers of a broken instance", () => {
    // Observed on a misconfigured mirror: a perfectly shaped but empty answer,
    // with a bogus timestamp, for an area full of stations.
    expect(
      isTrustworthyOverpassAnswer({
        elements: [],
        osm3s: { timestamp_osm_base: "117747" },
      }),
    ).toBe(false);
    expect(isTrustworthyOverpassAnswer({ elements: [] })).toBe(false);
  });

  it("rejects timeouts and rate limits reported as a remark", () => {
    expect(
      isTrustworthyOverpassAnswer({
        elements: [],
        remark: "runtime error: Query timed out in 'recurse' at line 1",
        osm3s: { timestamp_osm_base: "2026-10-15T09:00:00Z" },
      }),
    ).toBe(false);
  });

  it("rejects anything that is not an Overpass payload", () => {
    expect(isTrustworthyOverpassAnswer({})).toBe(false);
    expect(isTrustworthyOverpassAnswer({ elements: "nope" } as never)).toBe(
      false,
    );
  });
});
