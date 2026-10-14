import { describe, expect, it } from "vitest";
import {
  normalizeItStation,
  type RawItStation,
} from "@/countries/it/dataSource";

const raw: RawItStation = {
  id: "3464",
  lat: 45.464211,
  lon: 9.191383,
  brand: "Agip Eni",
  address: "VIA ROMA 1",
  city: "MILANO",
  province: "MI",
  highway: false,
  prices: { benzina: 1.999, gasolio: 2.21 },
};

const updatedAt = "2026-10-12T08:00:00+02:00";

describe("normalizeItStation", () => {
  it("builds a country-prefixed id and maps the fuels", () => {
    const station = normalizeItStation(raw, updatedAt);
    expect(station?.id).toBe("IT:3464");
    expect(station?.country).toBe("IT");
    expect(station?.brand).toBe("Agip Eni");
    expect(station?.fuels.map((fuel) => fuel.fuelId).sort()).toEqual([
      "benzina",
      "gasolio",
    ]);
    expect(station?.fuels[0].updatedAt).toBe(updatedAt);
    expect(station?.fuels[0].currency).toBe("EUR");
  });

  it("returns null without coordinates or without prices", () => {
    expect(normalizeItStation({ ...raw, lat: Number.NaN }, updatedAt)).toBeNull();
    expect(normalizeItStation({ ...raw, prices: {} }, updatedAt)).toBeNull();
  });
});
