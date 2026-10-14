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

interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

/** Minimal Cloudflare execution context. */
interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

/** Cloudflare geography attached to an incoming request. */
interface RequestCf {
  country?: string;
  city?: string;
  latitude?: string;
  longitude?: string;
}

export interface Env {
  ASSETS: AssetsBinding;
  /** Tankerkönig API key (Worker secret). */
  TANKERKOENIG_API_KEY?: string;
  /** Upstream Tankerkönig endpoint (overridable via `[vars]`). */
  TANKERKOENIG_API_URL?: string;
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

    // Everything else is the single-page app.
    return env.ASSETS.fetch(request);
  },
};
