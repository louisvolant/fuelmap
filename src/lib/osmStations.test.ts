import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchOsmStations,
  isTrustworthyOverpassAnswer,
} from "@/lib/osmStations";

const BOUNDS: [number, number, number, number] = [2.3, 48.8, 2.4, 48.9];

function stubFetch(payload: unknown, ok = true) {
  const spy = vi.fn(async (_input: RequestInfo | URL) =>
    new Response(JSON.stringify(payload), { status: ok ? 200 : 502 }),
  );
  vi.stubGlobal("fetch", spy);
  return spy;
}

describe("fetchOsmStations", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the worker endpoint with the bounding box", async () => {
    const spy = stubFetch({ stations: [] });
    await fetchOsmStations(BOUNDS);

    const requested = String(spy.mock.calls[0][0]);
    expect(requested).toContain("/api/osm/v3/stations");
    expect(requested).toContain("west=2.3");
    expect(requested).toContain("south=48.8");
    expect(requested).toContain("east=2.4");
    expect(requested).toContain("north=48.9");
  });

  it("returns the stations of the payload", async () => {
    stubFetch({
      stations: [
        {
          key: "node/1",
          lat: 48.8566,
          lon: 2.3522,
          brand: "Total",
          opening24h: true,
        },
      ],
    });

    const stations = await fetchOsmStations(BOUNDS);
    expect(stations).toHaveLength(1);
    expect(stations[0]).toMatchObject({ key: "node/1", brand: "Total" });
  });

  it("throws when the worker fails", async () => {
    stubFetch({}, false);
    await expect(fetchOsmStations(BOUNDS)).rejects.toThrow(/502/);
  });
});

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
    expect(isTrustworthyOverpassAnswer({ elements: "nope" } as never)).toBe(false);
  });
});
