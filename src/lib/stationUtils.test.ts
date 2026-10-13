import { describe, expect, it } from "vitest";
import type { NormalizedStation } from "@/countries/types";
import { cheapestFuel, displayFuel, hasAllFuels } from "@/lib/stationUtils";

function station(fuels: NormalizedStation["fuels"]): NormalizedStation {
  return {
    id: "FR:1",
    country: "FR",
    lat: 48.85,
    lon: 2.35,
    isHighway: false,
    fuels,
    services: [],
    automat24h: false,
    sourceId: "1",
  };
}

const prices: NormalizedStation["fuels"] = [
  { fuelId: "gazole", price: 1.9, currency: "EUR", available: true },
  { fuelId: "e10", price: 1.75, currency: "EUR", available: true },
  { fuelId: "sp98", price: 2.1, currency: "EUR", available: false },
];

describe("stationUtils", () => {
  it("finds the cheapest available fuel", () => {
    expect(cheapestFuel(station(prices))?.fuelId).toBe("e10");
  });

  it("respects the active fuel when it is available", () => {
    expect(displayFuel(station(prices), "gazole")?.fuelId).toBe("gazole");
  });

  it("returns nothing when the active fuel is unavailable (no misleading price)", () => {
    expect(displayFuel(station(prices), "sp98")).toBeUndefined();
  });

  it("ignores unavailable fuels when matching", () => {
    expect(hasAllFuels(station(prices), ["e10"])).toBe(true);
    expect(hasAllFuels(station(prices), ["sp98"])).toBe(false);
    expect(hasAllFuels(station(prices), [])).toBe(true);
  });
});
