import { describe, expect, it } from "vitest";
import { formatRadarDate, parseFrenchRadarsCsv, radarTypeLabelKey } from "@/lib/radars";

const CSV = [
  "\uFEFFNuméro de radar;Type de radar;Date de mise en service;VMA ;Latitude; Longitude",
  "12001;ETD;31/10/2011 00:00;70;+45.361;+4.2526",
  "FE391502;ETPN;26/06/2015 00:00;NA;+48.53771;+2.37489",
  "broken;ETF;01/01/2020 00:00;80;not-a-latitude;2.0",
  "",
].join("\r\n");

describe("parseFrenchRadarsCsv", () => {
  it("parses every valid row into a GeoJSON point", () => {
    const collection = parseFrenchRadarsCsv(CSV);

    expect(collection.type).toBe("FeatureCollection");
    expect(collection.features).toHaveLength(2);
    expect(collection.features[0]).toMatchObject({
      id: "12001",
      geometry: { type: "Point", coordinates: [4.2526, 45.361] },
      properties: {
        id: "12001",
        type: "ETD",
        maxSpeedKmh: 70,
        commissionedAt: "2011-10-31",
      },
    });
  });

  it("maps NA speeds to null and keeps non-speed cameras", () => {
    const feature = parseFrenchRadarsCsv(CSV).features[1];
    expect(feature.properties).toMatchObject({
      type: "ETPN",
      maxSpeedKmh: null,
      commissionedAt: "2015-06-26",
    });
  });

  it("skips rows with invalid coordinates", () => {
    const ids = parseFrenchRadarsCsv(CSV).features.map((feature) => feature.id);
    expect(ids).not.toContain("broken");
  });

  it("rejects an unexpected header", () => {
    expect(() => parseFrenchRadarsCsv("foo;bar\n1;2")).toThrow(/fixed-radar CSV header/);
  });
});

describe("radar helpers", () => {
  it("maps official types to translation keys", () => {
    expect(radarTypeLabelKey("ETFR")).toBe("radars.types.etfr");
    expect(radarTypeLabelKey("unknown")).toBe("radars.types.other");
  });

  it("formats the commissioning date", () => {
    expect(formatRadarDate("2011-10-31", "fr")).toContain("2011");
    expect(formatRadarDate(null, "fr")).toBeNull();
  });
});
