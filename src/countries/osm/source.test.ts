import { afterEach, describe, expect, it, vi } from "vitest";
import { createOsmAreaSource } from "@/countries/osm/source";

describe("createOsmAreaSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps worker OSM stations to stations without prices", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              stations: [
                {
                  key: "node/42",
                  lat: 50.8503,
                  lon: 4.3517,
                  brand: "Total",
                  city: "Bruxelles",
                  address: "5 Rue de la Loi",
                  postalCode: "1000",
                  opening24h: true,
                },
                {
                  key: "way/7",
                  lat: 49.61,
                  lon: 6.13,
                  brand: "ArcelorMittal",
                  opening24h: false,
                },
              ],
            }),
            { status: 200 },
          ),
      ),
    );

    const source = createOsmAreaSource({ id: "be-osm", country: "BE" });
    const stations = await source.fetchArea([2.5, 49.5, 6.4, 51.5]);

    expect(stations).toHaveLength(2);
    expect(stations[0]).toMatchObject({
      id: "BE:node/42",
      country: "BE",
      brand: "Total",
      city: "Bruxelles",
      postalCode: "1000",
      address: "5 Rue de la Loi",
      automat24h: true,
      fuels: [],
    });
    expect(stations[1]).toMatchObject({ id: "BE:way/7", lat: 49.61, lon: 6.13 });
  });
});
