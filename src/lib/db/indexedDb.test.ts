import { beforeEach, describe, expect, it } from "vitest";
import type { NormalizedStation } from "@/countries/types";
import {
  addFavorite,
  closeDb,
  getAllBrandResolutions,
  getFavorites,
  getMeta,
  getStationsByCountry,
  isFavorite,
  lastSyncKey,
  removeFavorite,
  saveBrandResolutions,
  saveStations,
  setMeta,
} from "@/lib/db/indexedDb";
import { BRAND_RESOLVER_VERSION } from "@/lib/brandResolutions";

function makeStation(id: string, country: NormalizedStation["country"]): NormalizedStation {
  return {
    id,
    country,
    lat: 48.85,
    lon: 2.35,
    isHighway: false,
    fuels: [],
    services: [],
    automat24h: false,
    sourceId: id,
  };
}

describe("indexedDb", () => {
  beforeEach(async () => {
    await closeDb();
  });

  it("replaces stations of a country and reads them back", async () => {
    await saveStations("FR", [makeStation("FR:1", "FR"), makeStation("FR:2", "FR")]);
    let stations = await getStationsByCountry("FR");
    expect(stations.map((station) => station.id).sort()).toEqual(["FR:1", "FR:2"]);

    // Saving again must replace, not duplicate.
    await saveStations("FR", [makeStation("FR:3", "FR")]);
    stations = await getStationsByCountry("FR");
    expect(stations.map((station) => station.id)).toEqual(["FR:3"]);
  });

  it("stores and reads metadata", async () => {
    await setMeta(lastSyncKey("FR"), 1234);
    expect(await getMeta<number>(lastSyncKey("FR"))).toBe(1234);
  });

  it("adds, checks and removes favorites", async () => {
    expect(await isFavorite("FR:1")).toBe(false);
    await addFavorite("FR:1", "FR");
    expect(await isFavorite("FR:1")).toBe(true);
    expect(await getFavorites()).toHaveLength(1);
    await removeFavorite("FR:1");
    expect(await isFavorite("FR:1")).toBe(false);
  });

  it("persists brand resolutions across sessions", async () => {
    await saveBrandResolutions([
      {
        stationId: "FR:1",
        brand: "TotalEnergies",
        lat: 48.85,
        lon: 2.35,
        resolvedAt: Date.now(),
        resolverVersion: BRAND_RESOLVER_VERSION,
      },
    ]);
    const resolutions = await getAllBrandResolutions();
    expect(resolutions.map((resolution) => resolution.stationId)).toEqual([
      "FR:1",
    ]);
  });
});
