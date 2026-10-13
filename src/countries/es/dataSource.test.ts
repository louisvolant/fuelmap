import { describe, expect, it } from "vitest";
import {
  normalizeEsFuels,
  normalizeEsStation,
  type RawEsStation,
} from "@/countries/es/dataSource";

const raw: RawEsStation = {
  IDEESS: "4375",
  Rótulo: "REPSOL",
  Dirección: "AVENIDA CASTILLA LA MANCHA, 26",
  "C.P.": "02250",
  Municipio: "Abengibre",
  Latitud: "39,211417",
  "Longitud (WGS84)": "-1,539167",
  Horario: "L-D: 24H",
  "Precio Gasoleo A": "1,799",
  "Precio Gasolina 95 E5": "1,699",
  "Precio Gasolina 98 E5": "",
};

describe("normalizeEsStation", () => {
  it("parses comma-decimal coordinates", () => {
    const station = normalizeEsStation(raw);
    expect(station?.lat).toBeCloseTo(39.211417, 6);
    expect(station?.lon).toBeCloseTo(-1.539167, 6);
  });

  it("builds a country-prefixed id and keeps the brand", () => {
    const station = normalizeEsStation(raw);
    expect(station?.id).toBe("ES:4375");
    expect(station?.brand).toBe("REPSOL");
    expect(station?.city).toBe("Abengibre");
  });

  it("flags 24H opening as an automated pump", () => {
    expect(normalizeEsStation(raw)?.automat24h).toBe(true);
    expect(
      normalizeEsStation({ ...raw, Horario: "L-D: 07:00-22:00" })?.automat24h,
    ).toBe(false);
  });

  it("returns null without coordinates", () => {
    expect(normalizeEsStation({ IDEESS: "1" })).toBeNull();
  });
});

describe("normalizeEsFuels", () => {
  it("maps priced columns and skips empty ones", () => {
    const fuels = normalizeEsFuels(raw, "2026-10-13T08:00:00+02:00");
    const ids = fuels.map((fuel) => fuel.fuelId);
    expect(ids).toContain("gasoleoA");
    expect(ids).toContain("gasolina95");
    expect(ids).not.toContain("gasolina98");

    const diesel = fuels.find((fuel) => fuel.fuelId === "gasoleoA");
    expect(diesel?.price).toBeCloseTo(1.799, 3);
    expect(diesel?.updatedAt).toBe("2026-10-13T08:00:00+02:00");
  });
});
