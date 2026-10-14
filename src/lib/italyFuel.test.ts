import { describe, expect, it } from "vitest";
import { matchItalianFuel, parseItalianStations } from "@/lib/italyFuel";

describe("matchItalianFuel", () => {
  it("maps the base fuels", () => {
    expect(matchItalianFuel("Benzina")).toBe("benzina");
    expect(matchItalianFuel("Gasolio")).toBe("gasolio");
    expect(matchItalianFuel("GPL")).toBe("gpl");
  });

  it("maps gas fuels", () => {
    expect(matchItalianFuel("Metano")).toBe("metano");
    expect(matchItalianFuel("GNL")).toBe("metano");
    expect(matchItalianFuel("L-GNC")).toBe("metano");
  });

  it("maps renewable diesel to HVO", () => {
    expect(matchItalianFuel("HVOlution")).toBe("hvo");
    expect(matchItalianFuel("HVO100")).toBe("hvo");
    expect(matchItalianFuel("Gasolio Bio HVO")).toBe("hvo");
  });

  it("folds premium variants into premium fuels", () => {
    expect(matchItalianFuel("Blue Diesel")).toBe("gasolioPremium");
    expect(matchItalianFuel("Supreme Diesel")).toBe("gasolioPremium");
    expect(matchItalianFuel("Benzina speciale")).toBe("benzinaPremium");
    expect(matchItalianFuel("Blue Super")).toBe("benzinaPremium");
    expect(matchItalianFuel("F101")).toBe("benzinaPremium");
  });

  it("returns undefined for unknown descriptions", () => {
    expect(matchItalianFuel("Unknown")).toBeUndefined();
  });
});

const ANAGRAFICA = [
  "Estrazione del 2026-10-12",
  "idImpianto|Gestore|Bandiera|Tipo Impianto|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine",
  "3464|ENI SPA|Agip Eni|Stradale|1234 MILANO|VIA ROMA 1|MILANO|MI|45.464211|9.191383",
  "9999|Autostrade|Autogrill|Autostradale|5678 NAPOLI|A1 KM 500|NAPOLI|NA|40.851775|14.268124",
].join("\n");

const PREZZI = [
  "Estrazione del 2026-10-12",
  "idImpianto|descCarburante|prezzo|isSelf|dtComu",
  // Full-service price first, then the (preferred) self-service price.
  "3464|Benzina|2.349|0|09/10/2026 19:30:07",
  "3464|Benzina|1.999|1|09/10/2026 19:30:06",
  "3464|Gasolio|2.210|1|09/10/2026 19:30:06",
  "9999|Benzina|2.400|1|09/10/2026 19:30:06",
].join("\n");

describe("parseItalianStations", () => {
  it("joins the two files and keeps only priced stations", () => {
    const payload = parseItalianStations(ANAGRAFICA, PREZZI);
    expect(payload.updatedAt).toBe("2026-10-12T08:00:00+02:00");
    expect(payload.stations).toHaveLength(2);

    const milano = payload.stations.find((station) => station.id === "3464");
    expect(milano).toMatchObject({
      lat: 45.464211,
      lon: 9.191383,
      brand: "Agip Eni",
      city: "MILANO",
      highway: false,
    });
  });

  it("prefers self-service prices", () => {
    const payload = parseItalianStations(ANAGRAFICA, PREZZI);
    const milano = payload.stations.find((station) => station.id === "3464");
    expect(milano?.prices.benzina).toBeCloseTo(1.999, 3);
    expect(milano?.prices.gasolio).toBeCloseTo(2.21, 3);
  });

  it("flags motorway stations", () => {
    const payload = parseItalianStations(ANAGRAFICA, PREZZI);
    expect(payload.stations.find((s) => s.id === "9999")?.highway).toBe(true);
  });
});
