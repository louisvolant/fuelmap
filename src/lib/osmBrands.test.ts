import { describe, expect, it } from "vitest";
import type { NormalizedStation } from "@/countries/types";
import {
  enrichStationsWithBrands,
  type OsmFuelNode,
} from "@/lib/osmBrands";

function station(id: string, lon: number, lat: number, brand?: string): NormalizedStation {
  return {
    id,
    country: "FR",
    lon,
    lat,
    brand,
    isHighway: false,
    fuels: [],
    services: [],
    automat24h: false,
    sourceId: id,
  };
}

describe("enrichStationsWithBrands", () => {
  it("fills the brand from the nearest OSM node", () => {
    const stations = [station("a", 2.3522, 48.8566)];
    const nodes: OsmFuelNode[] = [
      { lon: 2.35221, lat: 48.85661, brand: "Total" },
      { lon: 2.4, lat: 48.9, brand: "Shell" },
    ];
    expect(enrichStationsWithBrands(stations, nodes)[0].brand).toBe("Total");
  });

  it("keeps an existing brand", () => {
    const stations = [station("a", 2.3522, 48.8566, "Carrefour")];
    const nodes: OsmFuelNode[] = [{ lon: 2.3522, lat: 48.8566, brand: "Total" }];
    expect(enrichStationsWithBrands(stations, nodes)[0].brand).toBe("Carrefour");
  });

  it("ignores nodes farther than the radius", () => {
    const stations = [station("a", 2.3522, 48.8566)];
    const nodes: OsmFuelNode[] = [{ lon: 2.4, lat: 48.9, brand: "Shell" }];
    expect(enrichStationsWithBrands(stations, nodes, 60)[0].brand).toBeUndefined();
  });

  it("is a no-op without nodes", () => {
    const stations = [station("a", 2.3522, 48.8566)];
    expect(enrichStationsWithBrands(stations, [])).toBe(stations);
  });
});
