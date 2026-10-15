import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOsmStations } from "@/lib/osmStations";

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
    expect(requested).toContain("/api/osm/v2/stations");
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
