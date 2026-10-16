import { describe, expect, it } from "vitest";
import type { NormalizedStation } from "@/countries/types";
import {
  enrichStationsWithBrands,
  enrichStationsWithBrandsDetailed,
} from "@/lib/osmBrands";
import type { OsmFuelStation } from "@/lib/osmStations";

function station(
  id: string,
  lon: number,
  lat: number,
  brand?: string,
): NormalizedStation {
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

function node(
  key: string,
  lon: number,
  lat: number,
  brand?: string,
): OsmFuelStation {
  return { key, lon, lat, brand, opening24h: false };
}

describe("enrichStationsWithBrands", () => {
  it("fills the brand from the nearest OSM station", () => {
    const stations = [station("a", 2.3522, 48.8566)];
    const nodes = [
      node("node/1", 2.35221, 48.85661, "Total"),
      node("node/2", 2.4, 48.9, "Shell"),
    ];
    expect(enrichStationsWithBrands(stations, nodes)[0].brand).toBe("Total");
  });

  it("keeps an existing brand", () => {
    const stations = [station("a", 2.3522, 48.8566, "Carrefour")];
    const nodes = [node("node/1", 2.3522, 48.8566, "Total")];
    expect(enrichStationsWithBrands(stations, nodes)[0].brand).toBe("Carrefour");
  });

  it("ignores OSM stations beyond the radius", () => {
    const stations = [station("a", 2.3522, 48.8566)];
    const nodes = [node("node/1", 2.4, 48.9, "Shell")];
    expect(enrichStationsWithBrands(stations, nodes)[0].brand).toBeUndefined();
  });

  it("assigns each OSM station to at most one official station", () => {
    // Two official stations ~80 m apart, a single OSM node between them.
    const stations = [
      station("near", 2.3522, 48.8566),
      station("far", 2.3522, 48.8573),
    ];
    const nodes = [node("node/1", 2.3522, 48.8566, "Avia")];

    const enriched = enrichStationsWithBrands(stations, nodes);
    expect(enriched.find((s) => s.id === "near")?.brand).toBe("Avia");
    expect(enriched.find((s) => s.id === "far")?.brand).toBeUndefined();
  });

  it("is a no-op when there is nothing to match", () => {
    const stations = [station("a", 2.3522, 48.8566)];
    expect(enrichStationsWithBrands(stations, [])).toBe(stations);
    expect(
      enrichStationsWithBrands(stations, [node("node/1", 2.3522, 48.8566)]),
    ).toBe(stations);
  });

  it("reports provenance for every match", () => {
    const stations = [station("a", 2.3522, 48.8566)];
    const nodes = [node("node/7", 2.35221, 48.85661, "Total")];
    const { stations: enriched, assignments } =
      enrichStationsWithBrandsDetailed(stations, nodes);
    expect(enriched[0].brand).toBe("Total");
    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      stationId: "a",
      osmKey: "node/7",
    });
    expect(assignments[0].distanceM).toBeGreaterThanOrEqual(0);
    expect(assignments[0].distanceM).toBeLessThanOrEqual(120);
  });
});
