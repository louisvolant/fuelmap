import { describe, expect, it } from "vitest";
import type { NormalizedStation } from "@/countries/types";
import {
  BRAND_FETCH_MIN_ZOOM,
  CLUSTER_MAX_ZOOM,
  PRICE_MIN_ZOOM,
  stationsToFeatureCollection,
} from "@/components/map/stationLayers";

describe("zoom thresholds", () => {
  it("loads brand data no later than the clustering threshold", () => {
    // Brand data (OpenStreetMap enrichment) must be available as soon as
    // bubbles appear, otherwise markers are rendered without their logo.
    expect(BRAND_FETCH_MIN_ZOOM).toBeLessThanOrEqual(CLUSTER_MAX_ZOOM);
    expect(PRICE_MIN_ZOOM).toBeGreaterThanOrEqual(CLUSTER_MAX_ZOOM);
  });
});

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

  it("hides a station with neither a price nor a brand", () => {
    const nothing: NormalizedStation = { ...station, fuels: [], brand: undefined };
    const collection = stationsToFeatureCollection([nothing], null);
    expect(collection.features).toHaveLength(0);
  });

  it("dims a station that has a brand but no price", () => {
    const dimmed: NormalizedStation = {
      ...station,
      fuels: [],
      brand: "Total",
    };
    const collection = stationsToFeatureCollection([dimmed], null);
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].properties?.dimmed).toBe(true);
    expect(collection.features[0].properties?.hasPrice).toBe(false);
    expect(collection.features[0].properties?.priceLabel).toBeNull();
  });

  it("marks priced stations as not dimmed", () => {
    const collection = stationsToFeatureCollection([station], null);
    expect(collection.features[0].properties?.dimmed).toBe(false);
  });

  it("keeps every marker in a country without per-station prices", () => {
    const noPrice: NormalizedStation = { ...station, fuels: [], brand: undefined };
    const collection = stationsToFeatureCollection([noPrice], null, [], {
      showPrices: false,
    });
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].properties?.dimmed).toBe(false);
  });

  it("resolves the brand image from the station brand", () => {
    const branded: NormalizedStation = { ...station, brand: "Total Access" };
    const collection = stationsToFeatureCollection([branded], null);
    expect(collection.features[0].properties?.brandImage).toBe(
      "brand-totalenergies",
    );

    const unbranded = stationsToFeatureCollection([station], null);
    expect(unbranded.features[0].properties?.brandImage).toBe("");
  });

  it("puts the price inside the disc when the brand is unknown", () => {
    // The French open data has no brand, so most markers start out unbranded:
    // an empty white disc would be meaningless.
    const collection = stationsToFeatureCollection([station], "gazole");
    expect(collection.features[0].properties?.priceInDisc).toBe(true);
  });

  it("keeps the price in its capsule when the brand is known", () => {
    const branded: NormalizedStation = { ...station, brand: "Total" };
    const collection = stationsToFeatureCollection([branded], "gazole");
    expect(collection.features[0].properties?.priceInDisc).toBe(false);
  });

  it("never flags a dimmed marker as price-in-disc", () => {
    const dimmed: NormalizedStation = { ...station, fuels: [], brand: undefined };
    const collection = stationsToFeatureCollection([dimmed], null);
    expect(collection.features).toHaveLength(0);

    const brandedNoPrice: NormalizedStation = {
      ...station,
      fuels: [],
      brand: "Total",
    };
    const kept = stationsToFeatureCollection([brandedNoPrice], null);
    expect(kept.features[0].properties?.priceInDisc).toBe(false);
  });
});
