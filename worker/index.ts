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

    if (url.pathname === "/api/geo") {
      return handleGeo(request);
    }

    // Everything else is the single-page app.
    return env.ASSETS.fetch(request);
  },
};
