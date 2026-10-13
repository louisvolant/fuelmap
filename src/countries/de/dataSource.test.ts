import { describe, expect, it } from "vitest";
import {
  normalizeDeStation,
  type RawDeStation,
} from "@/countries/de/dataSource";

const raw: RawDeStation = {
  id: "abc-123",
  name: "Aral Tankstelle",
  brand: "ARAL",
  street: "Prinzenstraße",
  houseNumber: "1",
  postCode: "10969",
  place: "Berlin",
  lat: 52.501896,
  lng: 13.440946,
  diesel: 1.639,
  e5: 1.819,
  e10: 1.759,
  isOpen: true,
};

const updatedAt = "2026-10-13T20:00:00.000Z";

describe("normalizeDeStation", () => {
  it("builds a country-prefixed id and address", () => {
    const station = normalizeDeStation(raw, updatedAt);
    expect(station?.id).toBe("DE:abc-123");
    expect(station?.address).toBe("Prinzenstraße 1");
    expect(station?.postalCode).toBe("10969");
    expect(station?.brand).toBe("ARAL");
  });

  it("maps diesel, e5 and e10", () => {
    const station = normalizeDeStation(raw, updatedAt);
    expect(station?.fuels.map((fuel) => fuel.fuelId).sort()).toEqual([
      "diesel",
      "e10",
      "e5",
    ]);
    expect(station?.fuels[0].updatedAt).toBe(updatedAt);
  });

  it("skips fuels reported as unavailable (false)", () => {
    const station = normalizeDeStation({ ...raw, e10: false }, updatedAt);
    expect(station?.fuels.map((fuel) => fuel.fuelId)).not.toContain("e10");
  });

  it("returns null without coordinates", () => {
    expect(
      normalizeDeStation({ ...raw, lat: Number.NaN }, updatedAt),
    ).toBeNull();
  });
});
