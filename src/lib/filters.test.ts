import { describe, expect, it } from "vitest";
import type { NormalizedStation } from "@/countries/types";
import { applyStationFilters, DEFAULT_STATION_FILTERS } from "@/lib/filters";

function station(id: string, fuelIds: string[]): NormalizedStation {
  return {
    id,
    country: "FR",
    lat: 0,
    lon: 0,
    isHighway: false,
    fuels: fuelIds.map((fuelId) => ({
      fuelId,
      price: 1.5,
      currency: "EUR",
      available: true,
    })),
    services: [],
    automat24h: false,
    sourceId: id,
  };
}

const stations = [
  station("a", ["gazole", "e10"]),
  station("b", ["gazole", "sp95"]),
  station("c", ["e85"]),
];

describe("applyStationFilters", () => {
  it("returns every station when no fuel is selected", () => {
    expect(applyStationFilters(stations, DEFAULT_STATION_FILTERS)).toHaveLength(3);
  });

  it("keeps stations offering a single selected fuel", () => {
    const result = applyStationFilters(stations, { fuelIds: ["e85"] });
    expect(result.map((s) => s.id)).toEqual(["c"]);
  });

  it("keeps only stations offering every selected fuel (multi-filter)", () => {
    const result = applyStationFilters(stations, { fuelIds: ["gazole", "e10"] });
    expect(result.map((s) => s.id)).toEqual(["a"]);
  });

  it("returns nothing when no station matches", () => {
    const result = applyStationFilters(stations, { fuelIds: ["gplc"] });
    expect(result).toEqual([]);
  });
});
