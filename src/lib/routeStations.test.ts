import { describe, expect, it } from "vitest";
import type { NormalizedStation } from "@/countries/types";
import {
  distanceToRouteMeters,
  stationsAlongRoute,
} from "@/lib/routeStations";

function station(id: string, lon: number, lat: number): NormalizedStation {
  return {
    id,
    country: "FR",
    lat,
    lon,
    isHighway: false,
    fuels: [],
    services: [],
    automat24h: false,
    sourceId: id,
  };
}

// A rough north-east bound line near Paris.
const route: [number, number][] = [
  [2.3, 48.8],
  [2.4, 48.9],
];

describe("distanceToRouteMeters", () => {
  it("is (near) zero for a station on the line", () => {
    const onLine = station("on", 2.35, 48.85);
    expect(distanceToRouteMeters(onLine, route)).toBeLessThan(150);
  });

  it("grows with the offset from the line", () => {
    const near = station("near", 2.35, 48.86);
    const far = station("far", 2.5, 49.1);
    expect(distanceToRouteMeters(far, route)).toBeGreaterThan(
      distanceToRouteMeters(near, route),
    );
  });
});

describe("stationsAlongRoute", () => {
  it("keeps only stations within the corridor", () => {
    const stations = [
      station("on", 2.35, 48.85),
      station("far", 3.0, 49.5),
    ];
    const kept = stationsAlongRoute(stations, route, 2000);
    expect(kept.map((s) => s.id)).toEqual(["on"]);
  });

  it("returns nothing for a station far from the corridor", () => {
    const stations = [station("lyon", 4.83, 45.76)];
    expect(stationsAlongRoute(stations, route, 100)).toEqual([]);
  });
});
