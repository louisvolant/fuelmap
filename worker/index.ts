/**
 * Cloudflare Worker for FuelMap.
 *
 * It does three things:
 *  1. Serves the built SPA from the `ASSETS` binding (static assets, with SPA
 *     fallback so deep links resolve to `index.html`).
 *  2. Exposes `GET /api/de/stations` as a proxy in front of Tankerkönig, so the
 *     German API key stays server-side and never ships to the browser.
 *  3. Exposes `GET /api/it/stations`, which fetches and joins the two MIMIT CSV
 *     files (no CORS upstream) and caches the result at the edge.
 *  4. Exposes `GET /api/geo`, a coarse location derived from the client IP.
 *
 * Secrets are set once with `npx wrangler secret put TANKERKOENIG_API_KEY` and
 * are never wiped on deploy thanks to `keep_vars = true` in `wrangler.toml`.
 */
import { parseItalianStations } from "../src/lib/italyFuel";
import {
  parseBelgianMaxPrices,
  parseLuxembourgMaxPrices,
} from "../src/lib/maxPrices";
import {
  BRANDFETCH_DOMAINS,
  assetHostPath,
  logoContentType,
  pickBrandfetchLogos,
  sniffImageFormat,
  type BrandfetchBrand,
} from "../src/lib/brandfetch";

interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

/** Minimal Cloudflare execution context. */
interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Brand logos: snapshotted from the Brandfetch Brand API into R2.
 *
 * Brandfetch resolves brands by domain and its terms allow caching the assets
 * for 30 days, with a required refresh at least every 30 days. The cron in
 * `wrangler.toml` refreshes twice a month, so the licence never lapses.
 */
const BRAND_LOGO_PREFIX = "brands-logo/";
const BRAND_LOGO_MANIFEST = `${BRAND_LOGO_PREFIX}manifest.json`;
const BRAND_LOGO_REPORT = `${BRAND_LOGO_PREFIX}report.json`;
/** Brandfetch's cache licence is 30 days; refresh before it lapses. */
const BRAND_LOGO_MAX_AGE_MS = 29 * 24 * 60 * 60 * 1000;

interface BrandRefreshResult {
  id: string;
  status: string;
  name?: string;
  domain?: string;
  format?: string;
  type?: string;
  /** `host/path` of the asset that was fetched (never the signed query). */
  asset?: string;
}

/**
 * Assets are downloaded as a browser would embed them, because the CDN refuses
 * programmatic clients: without a browser `user-agent` **and** a `referer` it
 * answers `200` with its documentation page instead of the logo. The URLs still
 * come from the authenticated Brand API call below; the bytes are validated
 * (see `sniffImageFormat`) so this can never poison the cache again.
 *
 * Note: appending a `c` client parameter to these links returns a `403`, so the
 * URL from the API is used untouched.
 */
const ASSET_REQUEST_HEADERS: Record<string, string> = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  referer: "https://github.com/louisvolant/fuelmap",
  accept: "image/*,*/*;q=0.8",
};

/** Snapshot one brand from Brandfetch into R2. Returns the outcome status. */
async function refreshBrand(env: Env, id: string): Promise<BrandRefreshResult> {
  const domain = BRANDFETCH_DOMAINS[id as keyof typeof BRANDFETCH_DOMAINS];
  if (!domain) return { id, status: "unknown" };

  const base = env.BRANDFETCH_API_URL ?? "https://api.brandfetch.io/v2/brands";
  const apiKey = env.BRANDFETCH_API_KEY;
  const result: BrandRefreshResult = { id, domain };

  try {
    const response = await fetch(`${base}/${encodeURIComponent(domain)}`, {
      headers: {
        authorization: `Bearer ${apiKey ?? ""}`,
        accept: "application/json",
      },
    });
    if (!response.ok) {
      return { ...result, status: `api_${response.status}` };
    }

    const brand = (await response.json()) as BrandfetchBrand;
    result.name = brand.name;

    // Not every asset the API proposes can be downloaded, so walk the candidates
    // until one returns real image bytes.
    const candidates = pickBrandfetchLogos(brand).slice(0, 8);
    if (candidates.length === 0) return { ...result, status: "no_logo" };

    let failure = "no_logo";
    let lastAsset = "";
    for (const candidate of candidates) {
      lastAsset = assetHostPath(candidate.src);
      const asset = await fetch(candidate.src, {
        headers: {
          ...ASSET_REQUEST_HEADERS,
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
      });
      if (!asset.ok) {
        failure = `asset_${asset.status}`;
        continue;
      }

      const bytes = new Uint8Array(await asset.arrayBuffer());
      const format = sniffImageFormat(bytes);
      if (!format) {
        // Typically the CDN's HTML documentation page.
        failure = "asset_not_image";
        continue;
      }

      await env.BRANDS_BUCKET.put(`${BRAND_LOGO_PREFIX}${id}`, bytes, {
        httpMetadata: {
          contentType: logoContentType(format),
          cacheControl: "public, max-age=86400, stale-while-revalidate=2592000",
        },
        customMetadata: {
          refreshedAt: String(Date.now()),
          source: domain,
          // Host and path only: the query string may carry a signed token.
          asset: lastAsset,
          // Marks a snapshot whose bytes have been validated as an image. Older
          // snapshots lack it and are refetched once (see `handleBrandAsset`).
          verified: "1",
        },
      });

      return {
        ...result,
        status: "ok",
        format,
        type: candidate.type,
        asset: lastAsset,
      };
    }

    return { ...result, status: failure, asset: lastAsset };
  } catch {
    return { ...result, status: "error" };
  }
}

/** Refresh every brand; used by the cron (compliance + warm-up). */
async function refreshAllBrands(env: Env): Promise<BrandRefreshResult[]> {
  const results: BrandRefreshResult[] = [];
  for (const id of Object.keys(BRANDFETCH_DOMAINS)) {
    results.push(await refreshBrand(env, id));
  }

  await env.BRANDS_BUCKET.put(
    BRAND_LOGO_REPORT,
    JSON.stringify({ at: Date.now(), brands: results }),
    {
      httpMetadata: {
        contentType: "application/json; charset=utf-8",
        cacheControl: "public, max-age=60",
      },
    },
  );

  return results;
}

/**
 * Merge refresh outcomes into the diagnostic report, so a lazily triggered
 * refresh (the normal path) is observable through `/brands/report.json` too.
 * Diagnostics only: failures are ignored.
 */
async function recordRefresh(
  env: Env,
  results: BrandRefreshResult[],
): Promise<void> {
  if (results.length === 0) return;
  try {
    const existing = await env.BRANDS_BUCKET.get(BRAND_LOGO_REPORT);
    const report = existing
      ? await existing.json<{ brands?: BrandRefreshResult[] }>()
      : {};
    const byId = new Map(
      (report.brands ?? []).map((brand) => [brand.id, brand]),
    );
    for (const result of results) byId.set(result.id, result);

    await env.BRANDS_BUCKET.put(
      BRAND_LOGO_REPORT,
      JSON.stringify({ at: Date.now(), brands: [...byId.values()] }),
      {
        httpMetadata: {
          contentType: "application/json; charset=utf-8",
          cacheControl: "public, max-age=60",
        },
      },
    );
  } catch {
    // Diagnostics only.
  }
}

/** Age (ms) of a snapshot, or `Infinity` when unknown. */
function snapshotAge(object: R2ObjectBodyLike): number {
  const refreshedAt = Number(object.customMetadata?.refreshedAt ?? 0);
  return refreshedAt > 0 ? Date.now() - refreshedAt : Number.POSITIVE_INFINITY;
}

/**
 * Serve brand logos with a **dynamic, self-healing cache**:
 * 1. fresh snapshot in R2 → serve it (no upstream call);
 * 2. stale snapshot → serve it now and refresh in the background;
 * 3. no snapshot → answer 404 (the client falls back to the bundled mark) and
 *    fetch it in the background, so the next visitor gets the real logo.
 *
 * The cron stays as the compliance net (an API call at least every 30 days)
 * and as a warm-up.
 */
async function handleBrandAsset(
  pathname: string,
  env: Env,
  ctx: ExecutionContextLike,
): Promise<Response> {
  const name = pathname.slice("/brands/".length);
  if (!/^[a-z0-9.-]+$/.test(name)) {
    return json({ message: "invalid brand id" }, 400);
  }

  if (name === "manifest.json") {
    const list = await env.BRANDS_BUCKET.list({ prefix: BRAND_LOGO_PREFIX });
    const brands = list.objects
      .filter((object) => object.key !== BRAND_LOGO_MANIFEST && object.key !== BRAND_LOGO_REPORT)
      .map((object) => {
        const verified = object.customMetadata?.verified === "1";
        return {
          id: object.key.slice(BRAND_LOGO_PREFIX.length),
          // `unverified` snapshots were written before the bytes were validated:
          // they are refetched on the next request (a poisoned HTML page cannot
          // be displayed, so it must not look healthy here).
          status: verified ? "ok" : "unverified",
          contentType: object.httpMetadata?.contentType ?? null,
          refreshedAt: Number(object.customMetadata?.refreshedAt ?? 0) || null,
          asset: object.customMetadata?.asset ?? null,
        };
      });
    return json({
      at: Date.now(),
      // Never expose the key itself, only whether the Worker can see it.
      apiKeyConfigured: Boolean(env.BRANDFETCH_API_KEY),
      apiBaseUrl: env.BRANDFETCH_API_URL ?? "https://api.brandfetch.io/v2/brands",
      brands,
    });
  }

  if (name === "report.json") {
    const report = await env.BRANDS_BUCKET.get(BRAND_LOGO_REPORT);
    if (!report) return json({ at: null, brands: [] });
    return new Response(report.body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    });
  }

  if (!(name in BRANDFETCH_DOMAINS)) {
    return json({ message: "unknown brand" }, 404);
  }

  const key = `${BRAND_LOGO_PREFIX}${name}`;
  const object = await env.BRANDS_BUCKET.get(key);
  // Snapshots written before the bytes were validated are refetched once: a
  // cached HTML page can never be displayed and must not be served forever.
  const usable = object?.customMetadata?.verified === "1";

  if (!usable) {
    if (object) ctx.waitUntil(env.BRANDS_BUCKET.delete(key));
    // Nothing usable: refresh in the background, answer 404 so the client shows
    // the bundled mark instead of waiting.
    ctx.waitUntil(
      refreshBrand(env, name).then((result) => recordRefresh(env, [result])),
    );
    return new Response(null, {
      status: 404,
      headers: { "cache-control": "public, max-age=60" },
    });
  }

  if (snapshotAge(object) > BRAND_LOGO_MAX_AGE_MS) {
    ctx.waitUntil(
      refreshBrand(env, name).then((result) => recordRefresh(env, [result])),
    );
  }

  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "image/svg+xml",
      "cache-control": "public, max-age=86400, stale-while-revalidate=2592000",
    },
  });
}

/** Cloudflare geography attached to an incoming request. */
interface RequestCf {
  country?: string;
  city?: string;
  latitude?: string;
  longitude?: string;
}

/** Minimal Cloudflare R2 bucket. */
interface R2ObjectBodyLike {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
  json<T = unknown>(): Promise<T>;
}

interface R2BucketLike {
  get(key: string): Promise<R2ObjectBodyLike | null>;
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | string,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
  delete(key: string): Promise<unknown>;
  list(options?: { prefix?: string }): Promise<{
    objects: {
      key: string;
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    }[];
  }>;
}

export interface Env {
  ASSETS: AssetsBinding;
  /** Tankerkönig API key (Worker secret). */
  TANKERKOENIG_API_KEY?: string;
  /** Upstream Tankerkönig endpoint (overridable via `[vars]`). */
  TANKERKOENIG_API_URL?: string;
  /** R2 bucket holding the snapshotted brand logos. */
  BRANDS_BUCKET: R2BucketLike;
  /** Brandfetch Brand API key (Worker secret). */
  BRANDFETCH_API_KEY?: string;
  /** Brandfetch Brand API base URL (overridable via `[vars]`). */
  BRANDFETCH_API_URL?: string;
}

// Cloudflare's Cache API (not part of the standard lib DOM typings here).
declare const caches: { default: Cache };

const DEFAULT_TANKERKOENIG_URL =
  "https://creativecommons.tankerkoenig.de/json/list.php";

const ITALY_ANAGRAFICA_URL =
  "https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv";
const ITALY_PREZZI_URL =
  "https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv";
const ITALY_CACHE_KEY = "https://fuelmap.internal/api/it/stations";
const ONE_HOUR = 60 * 60;

/** Belgium: Statbel official (maximum) petroleum product rates as CSV. */const BELGIUM_MAX_PRICES_URL =
  "https://bestat.statbel.fgov.be/bestat/api/views/665e2960-bf86-4d64-b4a8-90f2d30ea892/result/CSV";
/** Luxembourg: official price table (first incl. VAT row is the current rate). */
const LUXEMBOURG_MAX_PRICES_URL = "https://www.petrol.lu/prix-officiels/";

/** Overpass mirrors, tried in order. */
const OSM_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const OSM_CACHE_TTL = 7 * 24 * 60 * 60;

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Run an Overpass query against the mirrors until one answers. */
async function queryOverpass(query: string): Promise<OverpassElement[]> {
  for (const mirror of OSM_MIRRORS) {
    try {
      const response = await fetch(mirror, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
          // Overpass requires a descriptive User-Agent.
          "user-agent":
            "FuelMap/1.0 (+https://github.com/louisvolant/fuelmap)",
        },
        body: new URLSearchParams({ data: query }).toString(),
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as { elements?: OverpassElement[] };
      if (Array.isArray(payload.elements)) return payload.elements;
    } catch {
      // Try the next mirror.
    }
  }
  return [];
}

/**
 * OpenStreetMap fuel stations for a bounding box, via Overpass.
 * Used for France (brand enrichment) and for Belgium / Luxembourg / Switzerland
 * (station positions). Cached at the edge for a week so a given area is fetched
 * from Overpass at most once per week across all users.
 */
async function handleOsmStations(
  url: URL,
  ctx: ExecutionContextLike,
): Promise<Response> {
  const west = Number(url.searchParams.get("west"));
  const south = Number(url.searchParams.get("south"));
  const east = Number(url.searchParams.get("east"));
  const north = Number(url.searchParams.get("north"));
  if (![west, south, east, north].every(Number.isFinite)) {
    return json({ message: "invalid bounding box" }, 400);
  }

  const cacheKey = new Request(
    `https://fuelmap.internal/api/osm/stations?w=${west.toFixed(2)}&s=${south.toFixed(2)}&e=${east.toFixed(2)}&n=${north.toFixed(2)}`,
    { method: "GET" },
  );
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const query = `[out:json][timeout:25];nwr["amenity"="fuel"](${south},${west},${north},${east});out center tags;`;
  const elements = await queryOverpass(query);

  const stations = elements.flatMap((element) => {
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];

    const tags = element.tags ?? {};
    const address = [tags["addr:housenumber"], tags["addr:street"]]
      .filter(Boolean)
      .join(" ")
      .trim();

    return [
      {
        key: `${element.type}/${element.id}`,
        lat: lat as number,
        lon: lon as number,
        brand: tags.brand ?? tags.operator ?? tags.name ?? null,
        city:
          tags["addr:city"] ?? tags["addr:town"] ?? tags["addr:village"] ?? null,
        address: address || null,
        postalCode: tags["addr:postcode"] ?? null,
        opening24h: tags.opening_hours === "24/7",
      },
    ];
  });

  const response = json({ stations });
  const headers = new Headers(response.headers);
  headers.set("cache-control", `public, max-age=${OSM_CACHE_TTL}`);
  ctx.waitUntil(
    caches.default.put(
      cacheKey,
      new Response(response.clone().body, { status: 200, headers }),
    ),
  );
  return response;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}

async function handleGermanStations(url: URL, env: Env): Promise<Response> {
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");
  const rad = url.searchParams.get("rad") ?? "10";

  if (!lat || !lng) {
    return json({ ok: false, message: "lat and lng are required" }, 400);
  }

  const upstream = new URL(env.TANKERKOENIG_API_URL ?? DEFAULT_TANKERKOENIG_URL);
  upstream.searchParams.set("lat", lat);
  upstream.searchParams.set("lng", lng);
  upstream.searchParams.set("rad", rad);
  upstream.searchParams.set("sort", "dist");
  upstream.searchParams.set("type", "all");
  if (env.TANKERKOENIG_API_KEY) {
    upstream.searchParams.set("apikey", env.TANKERKOENIG_API_KEY);
  }

  const response = await fetch(upstream, {
    headers: { accept: "application/json" },
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}

/**
 * Italy: MIMIT open data, fetched and joined server-side (no CORS upstream),
 * then cached at the edge for an hour.
 */
async function handleItalianStations(
  ctx: ExecutionContextLike,
): Promise<Response> {
  const cacheKey = new Request(ITALY_CACHE_KEY, { method: "GET" });
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const [anagraficaResponse, prezziResponse] = await Promise.all([
    fetch(ITALY_ANAGRAFICA_URL),
    fetch(ITALY_PREZZI_URL),
  ]);
  if (!anagraficaResponse.ok || !prezziResponse.ok) {
    return json({ message: "MIMIT data is unavailable" }, 502);
  }

  const [anagrafica, prezzi] = await Promise.all([
    anagraficaResponse.text(),
    prezziResponse.text(),
  ]);

  const response = json(parseItalianStations(anagrafica, prezzi));
  const headers = new Headers(response.headers);
  headers.set("cache-control", `public, max-age=${ONE_HOUR}`);
  ctx.waitUntil(
    caches.default.put(
      cacheKey,
      new Response(response.clone().body, { status: 200, headers }),
    ),
  );
  return response;
}

/**
 * Belgium / Luxembourg: official national maximum prices, parsed and cached.
 */
async function handleMaxPrices(
  url: URL,
  ctx: ExecutionContextLike,
): Promise<Response> {
  const country = (url.searchParams.get("country") ?? "").toUpperCase();
  if (country !== "BE" && country !== "LU") {
    return json({ message: "unsupported country" }, 400);
  }

  const cacheKey = new Request(
    `https://fuelmap.internal/api/max-prices/${country}`,
    { method: "GET" },
  );
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const source =
    country === "BE"
      ? { url: BELGIUM_MAX_PRICES_URL, parse: parseBelgianMaxPrices }
      : { url: LUXEMBOURG_MAX_PRICES_URL, parse: parseLuxembourgMaxPrices };

  const upstream = await fetch(source.url, {
    headers: { accept: "text/csv,text/html;q=0.9,*/*;q=0.8" },
  });
  if (!upstream.ok) {
    return json({ message: "price source unavailable" }, 502);
  }

  const response = json(source.parse(await upstream.text()));
  const headers = new Headers(response.headers);
  headers.set("cache-control", `public, max-age=${ONE_HOUR}`);
  ctx.waitUntil(
    caches.default.put(
      cacheKey,
      new Response(response.clone().body, { status: 200, headers }),
    ),
  );
  return response;
}

/**
 * Coarse location derived from the client IP address, using Cloudflare's
 * `request.cf`. Used as a fallback when geolocation is not authorized.
 */
function handleGeo(request: Request): Response {
  const cf = (request as Request & { cf?: RequestCf }).cf;
  const lat = cf?.latitude !== undefined ? Number(cf.latitude) : Number.NaN;
  const lon = cf?.longitude !== undefined ? Number(cf.longitude) : Number.NaN;

  return json({
    country: cf?.country ?? null,
    city: cf?.city ?? null,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  });
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContextLike,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/de/stations") {
      return handleGermanStations(url, env);
    }

    if (url.pathname === "/api/it/stations") {
      return handleItalianStations(ctx);
    }

    if (url.pathname === "/api/max-prices") {
      return handleMaxPrices(url, ctx);
    }

    if (url.pathname === "/api/osm/stations") {
      return handleOsmStations(url, ctx);
    }

    if (url.pathname === "/api/geo") {
      return handleGeo(request);
    }

    if (url.pathname.startsWith("/brands/")) {
      return handleBrandAsset(url.pathname, env, ctx);
    }

    // Everything else is the single-page app.
    return env.ASSETS.fetch(request);
  },

  /** Cron trigger: refresh the Brandfetch logo snapshots twice a month. */
  async scheduled(
    _event: unknown,
    env: Env,
    ctx: ExecutionContextLike,
  ): Promise<void> {
    ctx.waitUntil(refreshAllBrands(env));
  },
};
