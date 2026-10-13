import { describe, expect, it } from "vitest";
import type { NormalizedStation } from "@/countries/types";
import {
  applyStationFilters,
  collectServices,
  DEFAULT_STATION_FILTERS,
  type StationFilters,
} from "@/lib/filters";

function withFilters(overrides: Partial<StationFilters>): StationFilters {
  return { ...DEFAULT_STATION_FILTERS, ...overrides };
}

function station(
  id: string,
  options: {
    fuelIds?: string[];
    shortage?: boolean;
    automat24h?: boolean;
    services?: string[];
    lon?: number;
    lat?: number;
  } = {},
): NormalizedStation {
  return {
    id,
    country: "FR",
    lat: options.lat ?? 48.85,
    lon: options.lon ?? 2.35,
    isHighway: false,
    fuels: (options.fuelIds ?? []).map((fuelId) => ({
      fuelId,
      price: 1.5,
      currency: "EUR",
      available: true,
      shortage: options.shortage ? { type: "temporary" as const } : undefined,
    })),
    services: options.services ?? [],
    automat24h: options.automat24h ?? false,
    sourceId: id,
  };
}

const stations = [
  station("a", { fuelIds: ["gazole", "e10"], services: ["Boutique"] }),
  station("b", {
    fuelIds: ["gazole", "sp95"],
    automat24h: true,
    services: ["Wifi"],
  }),
  station("c", { fuelIds: ["e85"], shortage: true }),
];

describe("applyStationFilters", () => {
  it("returns every station when no filter is active", () => {
    expect(applyStationFilters(stations, DEFAULT_STATION_FILTERS)).toHaveLength(3);
  });

  it("keeps stations offering a single selected fuel", () => {
    const result = applyStationFilters(stations, withFilters({ fuelIds: ["e85"] }));
    expect(result.map((s) => s.id)).toEqual(["c"]);
  });

  it("keeps only stations offering every selected fuel (multi-filter)", () => {
    const result = applyStationFilters(
      stations,
      withFilters({ fuelIds: ["gazole", "e10"] }),
    );
    expect(result.map((s) => s.id)).toEqual(["a"]);
  });

  it("hides stations with a fuel shortage", () => {
    const result = applyStationFilters(
      stations,
      withFilters({ hideShortages: true }),
    );
    expect(result.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("keeps only stations with a 24/7 automated pump", () => {
    const result = applyStationFilters(stations, withFilters({ only24h: true }));
    expect(result.map((s) => s.id)).toEqual(["b"]);
  });

  it("requires every selected service", () => {
    const result = applyStationFilters(
      stations,
      withFilters({ services: ["Boutique", "Wifi"] }),
    );
    expect(result).toEqual([]);
  });

  it("filters by distance from a center", () => {
    const near = station("near", { lon: 2.351, lat: 48.851 });
    const far = station("far", { lon: 4.8357, lat: 45.764 });
    const result = applyStationFilters(
      [near, far],
      withFilters({ center: [2.3522, 48.8566], maxDistanceMeters: 5000 }),
    );
    expect(result.map((s) => s.id)).toEqual(["near"]);
  });
});

describe("collectServices", () => {
  it("returns sorted distinct services", () => {
    expect(collectServices(stations)).toEqual(["Boutique", "Wifi"]);
  });
});
