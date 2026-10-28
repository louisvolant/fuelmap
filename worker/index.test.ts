import { beforeEach, describe, expect, it, vi } from "vitest";
import worker from "./index";

/**
 * The OpenStreetMap endpoint is the one thing that can lose brand marks for a
 * whole country: the public Overpass mirrors are regularly saturated, and the
 * payload is cached for a week. These tests pin the contract:
 *  - a failure is never cached (it must not poison the week),
 *  - the last good payload kept in R2 is served during an outage (and is never
 *    written back to the cache, so a recovered Overpass is picked up at once).
 */

const OSM_PATH = "/api/osm/v3/stations";
const QUERY = "?west=2.40&south=48.80&east=2.50&north=48.83";
const LAST_GOOD_KEY = "osm-last-good/3/2.40,48.80,2.50,48.83";

interface StoredObject {
  value: string;
  options?: { customMetadata?: Record<string, string> };
  /** Changes on every put, like R2's etag. */
  etag?: string;
}

function makeBucket() {
  const store = new Map<string, StoredObject>();
  let uploads = 0;
  return {
    store,
    async get(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      return {
        body: new Response(entry.value).body,
        httpMetadata: { contentType: "application/json" },
        customMetadata: entry.options?.customMetadata ?? {},
        etag: entry.etag,
        json: async () => JSON.parse(entry.value),
      };
    },
    async put(key: string, value: unknown, options?: StoredObject["options"]) {
      uploads += 1;
      store.set(key, {
        value:
          typeof value === "string"
            ? value
            : new TextDecoder().decode(value as Uint8Array),
        options,
        etag: `etag-${uploads}`,
      });
      return {};
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list() {
      return { objects: [] };
    },
  };
}

function makeContext() {
  const pending: Promise<unknown>[] = [];
  return {
    pending,
    waitUntil: (promise: Promise<unknown>) => {
      pending.push(promise);
    },
  };
}

const cachePut = vi.fn(async () => undefined);
const cacheMatch = vi.fn(async () => undefined);

function makeEnv(bucket: ReturnType<typeof makeBucket>) {
  return {
    ASSETS: { fetch: async () => new Response("app") },
    BRANDS_BUCKET: bucket,
  } as never;
}

/** Every mirror fails, as happens when Overpass is saturated. */
function failUpstream() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("mirror down");
    }),
  );
}

/** Every mirror answers a real Overpass payload. */
function serveUpstream(payload: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    ),
  );
}

beforeEach(() => {
  cachePut.mockClear();
  cacheMatch.mockClear();
  vi.stubGlobal("caches", { default: { match: cacheMatch, put: cachePut } });
});

describe("GET /api/fr/brands/snapshot", () => {
  const SNAPSHOT_KEY = "brands-resolutions/v1/snapshot.json";

  /** In-memory stand-in for the edge cache, keyed by request URL. */
  function memoryCache() {
    const entries = new Map<string, string>();
    return {
      entries,
      match: vi.fn(async (request: Request) => {
        const body = entries.get(request.url);
        return body === undefined ? undefined : new Response(body);
      }),
      put: vi.fn(async (request: Request, response: Response) => {
        entries.set(request.url, await response.text());
      }),
    };
  }

  function snapshot(brands: Record<string, unknown>) {
    return JSON.stringify({ version: "v1", updatedAt: 1, brands });
  }

  it("picks up a republished snapshot instead of the stale cached copy", async () => {
    const bucket = makeBucket();
    const cache = memoryCache();
    vi.stubGlobal("caches", { default: { match: cache.match, put: cache.put } });
    const env = makeEnv(bucket);
    const request = new Request(
      "https://fuelmap.example/api/fr/brands/snapshot",
    );

    bucket.store.set(SNAPSHOT_KEY, {
      value: snapshot({ "FR:1": { brand: "Total", lat: 1, lon: 1 } }),
      etag: "v1",
    });
    const first = await worker.fetch(request, env, makeContext());
    expect(JSON.stringify(await first.json())).toContain("FR:1");
    await vi.waitFor(() => expect(cache.entries.size).toBe(1));

    // Republish: same key, new bytes → new etag → the cached copy must not win.
    bucket.store.set(SNAPSHOT_KEY, {
      value: snapshot({
        "FR:1": { brand: "Total", lat: 1, lon: 1 },
        "FR:2": { brand: "BP", lat: 2, lon: 2 },
      }),
      etag: "v2",
    });
    const second = await worker.fetch(request, env, makeContext());
    expect(JSON.stringify(await second.json())).toContain("FR:2");
  });
});

describe("GET /api/osm/v3/stations", () => {
  it("serves the last good payload from R2 when every mirror is down", async () => {
    const bucket = makeBucket();
    bucket.store.set(LAST_GOOD_KEY, {
      value: JSON.stringify({
        stations: [
          { key: "node/1", lat: 48.81, lon: 2.45, brand: "Total", opening24h: false },
        ],
      }),
    });
    failUpstream();

    const response = await worker.fetch(
      new Request(`https://fuelmap.example${OSM_PATH}${QUERY}`),
      makeEnv(bucket),
      makeContext(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-fuelmap-stale")).toBe("1");
    expect(await response.json()).toEqual({
      stations: [
        { key: "node/1", lat: 48.81, lon: 2.45, brand: "Total", opening24h: false },
      ],
    });
    // Never re-cached: the next request must retry Overpass.
    expect(cachePut).not.toHaveBeenCalled();
  });

  it("answers 502 and caches nothing when Overpass is down and R2 is empty", async () => {
    const bucket = makeBucket();
    failUpstream();

    const response = await worker.fetch(
      new Request(`https://fuelmap.example${OSM_PATH}${QUERY}`),
      makeEnv(bucket),
      makeContext(),
    );

    expect(response.status).toBe(502);
    expect(cachePut).not.toHaveBeenCalled();
    expect([...bucket.store.keys()]).toEqual([]);
  });

  it("races the mirrors and keeps the first trustworthy answer", async () => {
    const bucket = makeBucket();
    const contacted: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        contacted.push(url);
        if (url.includes("overpass-api.de")) throw new Error("saturated");
        if (url.includes("kumi")) return new Response("busy", { status: 500 });
        return new Response(
          JSON.stringify({
            elements: [
              {
                type: "node",
                id: 7,
                lat: 48.81,
                lon: 2.45,
                tags: { amenity: "fuel", brand: "BP" },
              },
            ],
          }),
          { status: 200 },
        );
      }),
    );

    const response = await worker.fetch(
      new Request(`https://fuelmap.example${OSM_PATH}${QUERY}`),
      makeEnv(bucket),
      makeContext(),
    );

    expect(response.status).toBe(200);
    // All three were asked at once: a saturated mirror no longer delays the rest.
    expect(new Set(contacted).size).toBe(3);
    const payload = (await response.json()) as {
      stations: { brand: string }[];
    };
    expect(payload.stations[0].brand).toBe("BP");
  });

  it("abandons a mirror that accepts the request but never answers", async () => {
    vi.useFakeTimers();
    try {
      const bucket = makeBucket();
      vi.stubGlobal(
        "fetch",
        vi.fn(
          (_input: RequestInfo | URL, init?: RequestInit) =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () =>
                reject(new Error("aborted")),
              );
            }),
        ),
      );

      const pending = worker.fetch(
        new Request(`https://fuelmap.example${OSM_PATH}${QUERY}`),
        makeEnv(bucket),
        makeContext(),
      );
      await vi.advanceTimersByTimeAsync(9_000);
      const response = await pending;

      expect(response.status).toBe(502);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the payload in R2 after a successful query", async () => {
    const bucket = makeBucket();
    serveUpstream({
      elements: [
        {
          type: "node",
          id: 1,
          lat: 48.81,
          lon: 2.45,
          tags: { amenity: "fuel", brand: "Total" },
        },
      ],
    });
    const context = makeContext();

    const response = await worker.fetch(
      new Request(`https://fuelmap.example${OSM_PATH}${QUERY}`),
      makeEnv(bucket),
      context,
    );

    expect(response.status).toBe(200);
    await Promise.all(context.pending);

    const stored = bucket.store.get(LAST_GOOD_KEY);
    expect(stored).toBeDefined();
    expect(stored?.options?.customMetadata?.at).toBeTruthy();
    expect(JSON.parse(stored?.value ?? "{}")).toEqual({
      stations: [
        {
          key: "node/1",
          lat: 48.81,
          lon: 2.45,
          brand: "Total",
          city: null,
          address: null,
          postalCode: null,
          opening24h: false,
        },
      ],
    });
    expect(cachePut).toHaveBeenCalledTimes(1);
  });
});

describe("brand logo assets", () => {
  it("serves snapshots CORS-open for canvas normalization", async () => {
    const bucket = makeBucket();
    bucket.store.set("brands-logo/bp", {
      value: "fake-bytes",
      options: {
        customMetadata: { verified: "1", refreshedAt: String(Date.now()) },
      },
    });
    const response = await worker.fetch(
      new Request("https://fuelmap.example/brands/bp"),
      makeEnv(bucket),
      makeContext(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });
});

describe("German stations proxy", () => {
  it("returns 503 when TANKERKOENIG_API_KEY is not configured", async () => {
    const env = {
      ASSETS: { fetch: vi.fn() },
      BRANDS_BUCKET: makeBucket(),
    } as unknown as Parameters<typeof worker.fetch>[1];

    const request = new Request(
      "https://fuelmap.test/api/de/stations?lat=52.5&lng=13.4",
    );
    const response = await worker.fetch(request, env, makeContext());
    expect(response.status).toBe(503);
    const body = (await response.json()) as { ok: boolean; message: string };
    expect(body.ok).toBe(false);
    expect(body.message).toContain("not configured");
  });
});

describe("French brand snapshot", () => {
  const MANIFEST_KEY = "brands-resolutions/v1/manifest.json";
  const SNAPSHOT_KEY = "brands-resolutions/v1/snapshot.json";

  it("answers an empty manifest when nothing is published", async () => {
    const bucket = makeBucket();
    const response = await worker.fetch(
      new Request("https://fuelmap.example/api/fr/brands/manifest"),
      makeEnv(bucket),
      makeContext(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ version: "v1", count: 0 });
  });

  it("answers 404 for a missing snapshot", async () => {
    const bucket = makeBucket();
    const response = await worker.fetch(
      new Request("https://fuelmap.example/api/fr/brands/snapshot"),
      makeEnv(bucket),
      makeContext(),
    );
    expect(response.status).toBe(404);
  });

  it("serves the published snapshot and caches it at the edge", async () => {
    const bucket = makeBucket();
    const payload = JSON.stringify({
      version: "v1",
      brands: { "FR:1": { brand: "TotalEnergies", lat: 48.85, lon: 2.35 } },
    });
    bucket.store.set(SNAPSHOT_KEY, { value: payload });
    bucket.store.set(
      MANIFEST_KEY,
      { value: JSON.stringify({ version: "v1", count: 1 }) },
    );
    const context = makeContext();

    const response = await worker.fetch(
      new Request("https://fuelmap.example/api/fr/brands/snapshot"),
      makeEnv(bucket),
      context,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(JSON.parse(payload));
    await Promise.all(context.pending);
    expect(cachePut).toHaveBeenCalledTimes(1);

    const manifest = await worker.fetch(
      new Request("https://fuelmap.example/api/fr/brands/manifest"),
      makeEnv(bucket),
      makeContext(),
    );
    expect(await manifest.json()).toMatchObject({ count: 1 });
  });
});

describe("French fixed radars", () => {
  const SNAPSHOT_KEY = "radars-fr/v1.geojson";
  const ENDPOINT = "https://fuelmap.example/api/fr/radars";
  const CSV = [
    "Numéro de radar;Type de radar;Date de mise en service;VMA ;Latitude; Longitude",
    "12001;ETD;31/10/2011 00:00;70;+45.361;+4.2526",
    "FE391502;ETPN;26/06/2015 00:00;NA;+48.53771;+2.37489",
  ].join("\r\n");
  const COLLECTION = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "12001",
        geometry: { type: "Point", coordinates: [4.2526, 45.361] },
        properties: {
          id: "12001",
          type: "ETD",
          maxSpeedKmh: 70,
          commissionedAt: "2011-10-31",
        },
      },
    ],
  };

  /** Encode text as Windows-1252 (accented characters are in the Latin-1 range). */
  function latin1Bytes(text: string): Uint8Array {
    return Uint8Array.from([...text].map((character) => character.charCodeAt(0)));
  }

  function storeSnapshot(bucket: ReturnType<typeof makeBucket>, ageMs: number) {
    bucket.store.set(SNAPSHOT_KEY, {
      value: JSON.stringify(COLLECTION),
      options: {
        customMetadata: { refreshedAt: String(Date.now() - ageMs) },
      },
    });
  }

  it("serves a fresh R2 snapshot without calling upstream", async () => {
    const bucket = makeBucket();
    storeSnapshot(bucket, 60_000);
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const context = makeContext();

    const response = await worker.fetch(
      new Request(ENDPOINT),
      makeEnv(bucket),
      context,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-fuelmap-stale")).toBeNull();
    expect(await response.json()).toEqual(COLLECTION);
    await Promise.all(context.pending);
    expect(upstream).not.toHaveBeenCalled();
    expect(cachePut).toHaveBeenCalledTimes(1);
  });

  it("builds the snapshot from the official CSV and stores it in R2", async () => {
    const bucket = makeBucket();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/datasets/liste-des-radars-fixes-en-france/")) {
          return new Response(
            JSON.stringify({
              resources: [
                {
                  format: "csv",
                  url: "https://example.test/radars.csv",
                  last_modified: "2025-12-30T00:00:00Z",
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(latin1Bytes(CSV), { status: 200 });
      }),
    );
    const context = makeContext();

    const response = await worker.fetch(
      new Request(ENDPOINT),
      makeEnv(bucket),
      context,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      features: { id: string }[];
    };
    expect(body.features.map((feature) => feature.id)).toEqual([
      "12001",
      "FE391502",
    ]);

    await Promise.all(context.pending);
    const stored = bucket.store.get(SNAPSHOT_KEY);
    expect(stored).toBeDefined();
    expect(stored?.options?.customMetadata?.count).toBe("2");
    expect(stored?.options?.customMetadata?.refreshedAt).toBeTruthy();
  });

  it("serves the last snapshot when the upstream is down and marks it stale", async () => {
    const bucket = makeBucket();
    storeSnapshot(bucket, 40 * 24 * 60 * 60 * 1000);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("upstream down");
      }),
    );
    const context = makeContext();

    const response = await worker.fetch(
      new Request(ENDPOINT),
      makeEnv(bucket),
      context,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-fuelmap-stale")).toBe("1");
    expect(await response.json()).toEqual(COLLECTION);
    await Promise.all(context.pending);
    expect(cachePut).not.toHaveBeenCalled();
  });

  it("answers 502 when there is no snapshot and the upstream fails", async () => {
    const bucket = makeBucket();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("upstream down");
      }),
    );

    const response = await worker.fetch(
      new Request(ENDPOINT),
      makeEnv(bucket),
      makeContext(),
    );

    expect(response.status).toBe(502);
    expect([...bucket.store.keys()]).toEqual([]);
  });
});
