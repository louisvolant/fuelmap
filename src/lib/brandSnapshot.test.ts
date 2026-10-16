import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchBrandSnapshot,
  parseBrandSnapshot,
} from "@/lib/brandSnapshot";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseBrandSnapshot", () => {
  it("converts valid entries and drops invalid ones", () => {
    const resolutions = parseBrandSnapshot({
      version: "v1",
      brands: {
        "FR:1": { brand: "TotalEnergies", lat: 48.85, lon: 2.35 },
        "FR:2": { brand: "", lat: 48.86, lon: 2.36 },
        "FR:3": { brand: "Esso", lat: Number.NaN, lon: 2.36 },
      },
    });
    expect(resolutions.map((r) => r.stationId)).toEqual(["FR:1"]);
    expect(resolutions[0]).toMatchObject({
      brand: "TotalEnergies",
      resolverVersion: "v1",
    });
  });

  it("rejects version-mismatched payloads", () => {
    expect(
      parseBrandSnapshot({ version: "v9", brands: { "FR:1": {} } }),
    ).toEqual([]);
  });

  it("rejects non-object payloads", () => {
    expect(parseBrandSnapshot(null)).toEqual([]);
    expect(parseBrandSnapshot([])).toEqual([]);
  });
});

describe("fetchBrandSnapshot", () => {
  it("returns null when nothing is published", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ version: "v1", count: 0 }), { status: 200 })),
    );
    await expect(fetchBrandSnapshot()).resolves.toBeNull();
  });

  it("fetches manifest then snapshot", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/manifest")) {
        return new Response(JSON.stringify({ version: "v1", count: 1 }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          version: "v1",
          brands: { "FR:1": { brand: "TotalEnergies", lat: 48.85, lon: 2.35 } },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const resolutions = await fetchBrandSnapshot();
    expect(resolutions).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
