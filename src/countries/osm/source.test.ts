import { afterEach, describe, expect, it, vi } from "vitest";
import { createOsmAreaSource } from "@/countries/osm/source";

describe("createOsmAreaSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps Overpass elements to stations without prices", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              elements: [
                {
                  type: "node",
                  id: 42,
                  lat: 50.8503,
                  lon: 4.3517,
                  tags: {
                    name: "Total Brussels",
                    brand: "Total",
                    "addr:city": "Bruxelles",
                    "addr:street": "Rue de la Loi",
                    "addr:housenumber": "5",
                    "addr:postcode": "1000",
                    opening_hours: "24/7",
                  },
                },
                // Ways carry their position in `center`.
                {
                  type: "way",
                  id: 7,
                  center: { lat: 49.61, lon: 6.13 },
                  tags: { operator: "ArcelorMittal" },
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
    expect(stations[1]).toMatchObject({
      id: "BE:way/7",
      brand: "ArcelorMittal",
      lat: 49.61,
      lon: 6.13,
    });
  });
});
