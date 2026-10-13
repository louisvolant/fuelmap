import { describe, expect, it } from "vitest";
import type { NormalizedStation } from "@/countries/types";
import { sortStations } from "@/lib/sortStations";

function station(
  id: string,
  price: number | undefined,
  lon: number,
  lat: number,
): NormalizedStation {
  return {
    id,
    country: "FR",
    lat,
    lon,
    isHighway: false,
    fuels:
      price === undefined
        ? []
        : [{ fuelId: "gazole", price, currency: "EUR", available: true }],
    services: [],
    automat24h: false,
    sourceId: id,
  };
}

const stations = [
  station("far-cheap", 1.7, 4.8357, 45.764),
  station("near-pricey", 1.9, 2.3522, 48.8566),
  station("no-price", undefined, 2.35, 48.85),
];

describe("sortStations", () => {
  it("sorts by price ascending, unpriced stations last", () => {
    const sorted = sortStations(stations, { sortBy: "price", fuelId: "gazole" });
    expect(sorted.map((s) => s.id)).toEqual([
      "far-cheap",
      "near-pricey",
      "no-price",
    ]);
  });

  it("sorts by distance when a center is provided", () => {
    const sorted = sortStations(stations, {
      sortBy: "distance",
      fuelId: "gazole",
      center: [2.3522, 48.8566],
    });
    expect(sorted[0].id).toBe("near-pricey");
    expect(sorted.at(-1)?.id).toBe("far-cheap");
  });

  it("falls back to price when no center is available", () => {
    const sorted = sortStations(stations, {
      sortBy: "distance",
      fuelId: "gazole",
      center: undefined,
    });
    expect(sorted[0].id).toBe("far-cheap");
  });
});
