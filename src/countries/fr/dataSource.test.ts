import { describe, expect, it } from "vitest";
import {
  normalizeFrStation,
  parseOpeningHours,
  type RawFrRecord,
} from "@/countries/fr/dataSource";

const rawStation: RawFrRecord = {
  id: 89100001,
  geom: { lon: 3.309, lat: 48.183 },
  latitude: "4818300",
  longitude: "330900",
  cp: "89100",
  pop: "R",
  adresse: "84 ROUTE DE MAILLOT",
  ville: "Sens",
  services_service: ["Wifi", "DAB (Distributeur automatique de billets)"],
  horaires_automate_24_24: "Non",
  gazole_prix: 2.399,
  gazole_maj: "2026-10-11 08:50:09",
  e10_prix: 2.229,
  e10_maj: "2026-10-11 08:50:09",
  sp95_prix: null,
  sp95_maj: null,
  sp95_rupture_type: "definitive",
  sp95_rupture_debut: "2022-11-26 09:30:22",
};

describe("normalizeFrStation", () => {
  it("trusts geom over the ×100000 legacy coordinates", () => {
    const station = normalizeFrStation(rawStation);
    expect(station?.lat).toBeCloseTo(48.183, 5);
    expect(station?.lon).toBeCloseTo(3.309, 5);
  });

  it("builds a globally unique id", () => {
    expect(normalizeFrStation(rawStation)?.id).toBe("FR:89100001");
  });

  it("maps available fuels with price and update time", () => {
    const station = normalizeFrStation(rawStation);
    const gazole = station?.fuels.find((fuel) => fuel.fuelId === "gazole");
    expect(gazole?.available).toBe(true);
    expect(gazole?.price).toBeCloseTo(2.399, 3);
    expect(gazole?.currency).toBe("EUR");
    expect(gazole?.updatedAt).toBeDefined();
  });

  it("keeps unavailable fuels as shortage entries", () => {
    const station = normalizeFrStation(rawStation);
    const sp95 = station?.fuels.find((fuel) => fuel.fuelId === "sp95");
    expect(sp95?.available).toBe(false);
    expect(sp95?.price).toBeUndefined();
    expect(sp95?.shortage?.type).toBe("definitive");
    expect(sp95?.shortage?.since).toBeDefined();
  });

  it("keeps services and highway flag", () => {
    const station = normalizeFrStation(rawStation);
    expect(station?.services).toContain("Wifi");
    expect(station?.isHighway).toBe(false);
  });

  it("returns null when coordinates are missing", () => {
    const broken: RawFrRecord = { id: 1, latitude: "0", longitude: "0" };
    expect(normalizeFrStation(broken)).toBeNull();
  });
});

describe("parseOpeningHours", () => {
  it("parses the FR horaires payload", () => {
    const raw = JSON.stringify({
      "@automate-24-24": "",
      jour: [
        {
          "@id": "1",
          "@nom": "Lundi",
          "@ferme": "",
          "@ouverture": { "@horaire": { "@debut": "06.00", "@fin": "22.00" } },
        },
        { "@id": "7", "@nom": "Dimanche", "@ferme": "1" },
      ],
    });

    const hours = parseOpeningHours(raw);
    expect(hours?.days).toHaveLength(2);
    expect(hours?.days[0]).toMatchObject({
      day: "Lundi",
      closed: false,
      periods: [{ from: "06:00", to: "22:00" }],
    });
    expect(hours?.days[1].closed).toBe(true);
  });

  it("returns undefined for invalid JSON", () => {
    expect(parseOpeningHours("not json")).toBeUndefined();
    expect(parseOpeningHours(undefined)).toBeUndefined();
  });
});
