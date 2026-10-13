import { describe, expect, it } from "vitest";
import type { NormalizedStation } from "@/countries/types";
import { stationsToFeatureCollection } from "@/components/map/stationLayers";

const station: NormalizedStation = {
  id: "FR:1",
  country: "FR",
  lat: 48.85,
  lon: 2.35,
  isHighway: false,
  fuels: [
    { fuelId: "gazole", price: 1.9, currency: "EUR", available: true },
    { fuelId: "e10", price: 1.75, currency: "EUR", available: true },
  ],
  services: [],
  automat24h: false,
  sourceId: "1",
};

describe("stationsToFeatureCollection", () => {
  it("uses the cheapest fuel price by default", () => {
    const collection = stationsToFeatureCollection([station], null);
    expect(collection.features[0].properties?.priceLabel).toBe("1.750");
    expect(collection.features[0].properties?.id).toBe("FR:1");
    expect(collection.features[0].geometry.coordinates).toEqual([2.35, 48.85]);
  });

  it("uses the active fuel price when provided", () => {
    const collection = stationsToFeatureCollection([station], "gazole");
    expect(collection.features[0].properties?.priceLabel).toBe("1.900");
  });

  it("marks stations without a price", () => {
    const noPrice: NormalizedStation = { ...station, fuels: [] };
    const collection = stationsToFeatureCollection([noPrice], null);
    expect(collection.features[0].properties?.hasPrice).toBe(false);
    expect(collection.features[0].properties?.priceLabel).toBeNull();
  });
});
