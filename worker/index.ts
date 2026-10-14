/**
 * Cloudflare Worker for FuelMap.
 *
 * It does two things:
 *  1. Serves the built SPA from the `ASSETS` binding (static assets, with SPA
 *     fallback so deep links resolve to `index.html`).
 *  2. Exposes `GET /api/de/stations` as a small proxy in front of Tankerkönig,
 *     so the German API key stays server-side and never ships to the browser.
 *
 * The key is provided as a Worker secret (`TANKERKOENIG_API_KEY`) and is never
 * wiped on deploy thanks to `keep_vars = true` in `wrangler.toml`.
 */

interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  ASSETS: AssetsBinding;
  /** Tankerkönig API key (Worker secret). */
  TANKERKOENIG_API_KEY?: string;
  /** Upstream Tankerkönig endpoint (overridable via `[vars]`). */
  TANKERKOENIG_API_URL?: string;
}

const DEFAULT_TANKERKOENIG_URL =
  "https://creativecommons.tankerkoenig.de/json/list.php";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/de/stations") {
      return handleGermanStations(url, env);
    }

    if (url.pathname === "/api/geo") {
      return handleGeo(request);
    }

    // Everything else is the single-page app.
    return env.ASSETS.fetch(request);
  },
};
