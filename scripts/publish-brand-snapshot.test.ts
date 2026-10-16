import { describe, expect, it, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendTileNodes,
  runTileQueue,
  distanceMeters,
  fetchDgccrf,
  joinStations,
  loadCheckpoint,
  parseArgs,
  parseBbox,
  queryOverpass,
  saveDoneCheckpoint,
  saveStationsCheckpoint,
  splitBbox,
  toManifestPayload,
  toSnapshotPayload,
} from "./publish-brand-snapshot.mjs";

describe("publish-brand-snapshot", () => {
  it("parses argv and bboxes", () => {
    expect(parseArgs(["--bbox", "1,2,3,4", "--dry"])).toEqual({
      bbox: "1,2,3,4",
      dry: true,
    });
    expect(parseBbox("2.2,48.6,2.7,49", [0, 0, 0, 0])).toEqual([
      2.2, 48.6, 2.7, 49,
    ]);
    expect(() => parseBbox("nope", [0, 0, 0, 0])).toThrow(/invalid --bbox/);
  });

  it("splits a bbox into overlapping tiles", () => {
    const tiles = splitBbox([0, 0, 1, 1], 0.5);
    expect(tiles).toHaveLength(4);
    // Overlap margin: the first tile starts below 0 and extends past 0.5.
    expect(tiles[0][0]).toBeLessThan(0);
    expect(tiles[0][2]).toBeGreaterThan(0.5);
  });

  it("joins stations to OSM nodes with unique assignment", () => {
    const stations = [
      { id: "FR:1", lat: 48.8566, lon: 2.3522 },
      { id: "FR:2", lat: 48.8566, lon: 2.3522 },
    ];
    const nodes = [{ key: "node/1", lat: 48.85661, lon: 2.35221, brand: "Total" }];
    const matches = joinStations(stations, nodes);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      brand: "Total",
      osmKey: "node/1",
    });
    expect(distanceMeters([2.3522, 48.8566], [2.35221, 48.85661])).toBeLessThan(
      120,
    );
  });

  it("builds versioned snapshot and manifest payloads", () => {
    const matches = [
      {
        station: { id: "FR:1", lat: 48.85, lon: 2.35 },
        brand: "Total",
        osmKey: "node/1",
        distanceM: 3.2,
      },
    ];
    const snapshot = toSnapshotPayload(matches, 1000);
    expect(snapshot).toEqual({
      version: "v1",
      updatedAt: 1000,
      brands: {
        "FR:1": {
          brand: "Total",
          osmKey: "node/1",
          lat: 48.85,
          lon: 2.35,
          distanceM: 3.2,
          resolvedAt: 1000,
        },
      },
    });
    expect(toManifestPayload(matches, 1000)).toMatchObject({
      version: "v1",
      count: 1,
    });
  });

  it("fetches DGCCRF coordinates page by page", async () => {
    const fetchMock = vi.fn(async (url: URL) => {
      const offset = Number(url.searchParams.get("offset"));
      expect(url.searchParams.get("select")).toBe("id,geom");
      const results =
        offset === 0
          ? [
              { id: 1, geom: { lat: 48.85, lon: 2.35 } },
              { id: 2, geom: null },
            ]
          : [];
      return { ok: true, json: async () => ({ results }) } as Response;
    });
    const stations = await fetchDgccrf(fetchMock as typeof fetch);
    expect(stations).toEqual([{ id: "FR:1", lat: 48.85, lon: 2.35 }]);
  });

  it("returns null when every mirror fails", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("mirror down");
    });
    await expect(
      queryOverpass([2.4, 48.8, 2.5, 48.9], {
        fetchImpl: fetchMock as typeof fetch,
        rounds: 1,
      }),
    ).resolves.toBeNull();
  });

  it("fetches every tile exactly once, up to the job limit", async () => {
    const pending = [0, 1, 2, 3, 4].map((index) => ({ tile: [index], index }));
    let inFlight = 0;
    let maxInFlight = 0;
    const seen = [];
    await runTileQueue(
      pending,
      async (tile) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return tile;
      },
      (index, result) => {
        seen.push([index, result]);
      },
      2,
    );
    expect(seen.map(([index]) => index).sort()).toEqual([0, 1, 2, 3, 4]);
    expect(maxInFlight).toBeLessThanOrEqual(2);
    expect(maxInFlight).toBeGreaterThan(1);
  });

  it("round-trips a checkpoint so --resume skips done tiles", () => {
    const outDir = mkdtempSync(join(tmpdir(), "snapshot-"));
    expect(loadCheckpoint(outDir)).toBeNull();

    const stations = [{ id: "FR:1", lat: 48.85, lon: 2.35 }];
    saveStationsCheckpoint(outDir, stations);
    appendTileNodes(outDir, [{ key: "node/1", brand: "Total" }]);
    appendTileNodes(outDir, []);
    saveDoneCheckpoint(outDir, new Set([0, 2]));

    const checkpoint = loadCheckpoint(outDir);
    expect(checkpoint?.stations).toEqual(stations);
    expect(checkpoint?.nodes).toEqual([{ key: "node/1", brand: "Total" }]);
    expect(checkpoint?.done).toEqual(new Set([0, 2]));
  });
});
