# FuelMap

A free, full-screen-map fuel price comparator for France, inspired by
[Essence&Co](https://mon-essence.fr/infos/). Find the cheapest fuel stations
around you, filter by fuel type, check prices and how fresh they are, jump
straight to Waze / Google Maps / Apple Maps, and save your favorite stations
locally — no account, no tracking.

Built as an installable **PWA** on top of **MapLibre GL JS** and
**[OpenFreeMap](https://openfreemap.org/)** vector tiles, using the official
French government fuel-price open data.

> **Status:** Phase 1 (MVP, France) is complete. The architecture is designed to
> accept other European countries in phase 2 without rework.
> See [`DEV_PLAN.md`](./DEV_PLAN.md) for the full plan.

---

## Features

- 🗺️ **Full-screen map** — OpenFreeMap vector tiles, no API key, no cost.
- 🌍 **7 countries** — France, Belgium, Luxembourg, Germany, Switzerland, Italy
  and Spain. Each brings its own fuel catalog and price source. Belgium and
  Luxembourg only publish a regulated **national maximum price**; Switzerland
  has station positions (OpenStreetMap) without prices.
- 🏷️ **Brand mark on every bubble** — from zoom 12.5 each station is a round
  white bubble with its brand mark (TotalEnergies, Esso, E.Leclerc, Carrefour,
  Avia, Système U, Intermarché, Netto, Shell, Fulli, Auchan, Eni, Dyneff, Élan,
  Match, Cora, BP). From zoom 13.5 the bubble opens into a capsule: mark on the
  left, the selected fuel's price in a rounded capsule right behind it.
- 🌫️ **Dimmed markers** — a station that does not offer the current fuel (or has
  it in shortage) stays on the map, greyed out; stations with neither a price nor
  a brand are not drawn at all.
- ⛽ **Fuel filter** — the active country's fuels; single or multi-select.
- 🗺️ **Basemap styles** — switch between **Liberty** (default), **Bright**,
  **Positron** and **Dark** on the fly, plus an **Auto** mode that follows the
  theme. The choice is persisted.
- 📋 **Sortable list** — stations ranked by price or by distance.
- 🧭 **Stations on your route** — pick a destination on the map, then keep only
  the stations along the driving route.
- 💶 **Prices on markers** — the selected fuel's price, in a rounded capsule
  right of the brand mark, from zoom 13.5.
- 📍 **Station detail sheet** — every fuel with its price, **last-update time**,
  shortages, services and opening hours.
- 🧭 **Navigation hand-off** — one tap to **Waze**, **Google Maps** or **Apple Maps**.
- ⭐ **Local favorites** — stored in **IndexedDB**, highlighted on the map, offline-friendly.
- 🎛️ **Advanced filters** — hide shortages, 24/7 automated pumps only, required
  services, and a radius around your position.
- 📌 **Geolocation** — the app opens around you (5–10 km) when geolocation is
  already authorized, otherwise around the **IP-based location** (Cloudflare
  `request.cf`), with a recenter button at any time.
- 🪟 **Station details panel** — a right-hand slide-over on desktop and phones in
  landscape, switchable to the left; a bottom sheet on small portrait screens.
- 📈 **Fill-up history** — delegated to [FuelStats](https://www.fuelstats.net).
- 🌗 **Light / dark theme**, following the system by default.
- 🌍 **7 UI languages** — `fr`, `uk`, `de`, `es`, `pt`, `it`, `nl`.
- 📱 **Installable PWA** — offline app shell, cached tiles and prices.
- ⚡ **Light first load** — MapLibre (~1 MB) is lazy-loaded in its own chunk, so
  the app shell, filters and sheets paint without waiting for the map engine.

## Tech stack

| Concern | Choice |
|---|---|
| Build | Vite |
| UI | React 18 + TypeScript |
| Map | MapLibre GL JS + OpenFreeMap |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Data fetching / cache | TanStack Query |
| Local storage | IndexedDB (`idb`) |
| i18n | i18next + react-i18next |
| PWA | vite-plugin-pwa (Workbox) |
| Tests | Vitest + Testing Library, Playwright |
| Hosting | Cloudflare (Pages) |

## Data sources

### France (MVP)

- **Dataset:** *Prix des carburants en France — Flux instantané v2* (DGCCRF)
- **Endpoint:** `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records`
- **Refresh:** every 10 minutes at the source (~9 800 stations)
- **License:** Licence Ouverte v2.0 (Etalab) — attribution required
- **Attribution:** *Prix des carburants — DGCCRF / data.economie.gouv.fr*
- ⚠️ The API exposes neither brand nor station name, and its `latitude`/`longitude`
  fields are integers ×100 000 — FuelMap only trusts the `geom` field.
- **Brands are derived from OpenStreetMap**: fuel stations (`amenity=fuel`) are
  fetched for the current viewport (from zoom 11) **through the Worker** — the
  public Overpass API rate-limits direct browser use — and matched to the nearest
  official station within 120 m, with a **unique assignment** (each OSM station
  brands at most one official station). Results are cached for a week, both at
  the edge and in IndexedDB. Only used for France; Spain (`Rótulo`) and Germany
  (`brand`) expose brands natively.

### Brand marks

Brand logos live in `src/assets/brands/*.svg` as small, round SVG marks
(64×64, brand colour + short wordmark) and are registered as MapLibre images at
runtime. They are **simplified marks**, not the official artwork, so they stay
lightweight and fit inside a circular marker. To use official logos, replace the
matching file (same name, 64×64 viewBox) — nothing else needs to change. Brand
matching is alias-based (`src/lib/brands.ts`).

#### Official logos (Brandfetch → R2)

Real brand logos are snapshotted from the **Brandfetch Brand API** (the only
Brandfetch product whose terms allow caching) into R2 and served by the Worker.

- `src/lib/brandfetch.ts` holds the reviewable **name → domain** table and the
  asset-picking rules (icon → light theme → SVG, square-ish preferred).
- `GET /brands/<id>` is a **self-healing cache**:
  1. fresh snapshot (< 29 days) → served straight from R2, no upstream call;
  2. stale snapshot → served immediately, refreshed in the background;
  3. no snapshot → the client draws the bundled mark while the Worker fetches the
     logo in the background, so the next visitor gets the real one.

  There is **nothing to trigger manually**.
- The **cron** (`0 4 1,16 * *`) is only the compliance net — Brandfetch's terms
  grant a 30-day cache licence that must be renewed by an API call at least every
  30 days — plus a warm-up for brands nobody views.
- Diagnostics: `/brands/manifest.json` (what is cached, with timestamps) and
  `/brands/report.json` (per-brand status of the last full refresh: `ok`,
  `no_logo`, `api_404`…). Domains flagged `// verify` in `src/lib/brandfetch.ts`
  still need a visual check (Netto FR/DE, Cora, Shell/BP).
- `npm run brands:check` (with `BRANDFETCH_API_KEY` in the environment) verifies
  the whole name → domain table against the live Brand API and prints, per brand,
  the resolved name and the picked logo variant — the fastest way to fix the
  domains flagged `// verify`.
- The client always tries `/brands/<id>` first and falls back to the bundled SVG,
  so it never waits for a third party and keeps working offline.

> **Trademarks.** Logos are the property of their respective owners and are used
> here for identification only; this app is not affiliated with, nor endorsed by,
> these brands.

### Italy

- **Dataset:** *Prezzi praticati e anagrafica degli impianti* (MIMIT /
  Osservaprezzi Carburanti), daily at 08:00, two `|`-separated CSV files.
- **No CORS upstream**, so the Cloudflare Worker fetches both files, joins them by
  station id and caches the result at the edge (`/api/it/stations`). Self-service
  prices are preferred; brand-specific premium variants are folded into generic
  premium fuels.
- **License:** IODL 2.0.

### Belgium, Luxembourg and Switzerland

- **No per-station price API exists** in these countries. Stations come from
  **OpenStreetMap** (`amenity=fuel` via Overpass, area-based like Germany) and
  carry no per-station price.
- **Belgium** and **Luxembourg** publish an official **national maximum price**
  (identical at every station), fetched and parsed by the Worker
  (`GET /api/max-prices?country=BE|LU`) from Statbel (BE) and the official price
  table (LU), and shown as a clearly-labelled banner.
- **Switzerland** has no price data at all: positions only.

### Basemap

- **[OpenFreeMap](https://openfreemap.org/)** — free, unlimited vector tiles from
  OpenStreetMap data, no registration or API key.
- Four styles are available from a picker on the map: **Liberty** (default,
  colourful), **Bright**, **Positron** (monochrome) and **Dark**, plus an
  **Auto** mode that follows the UI theme. The choice is persisted. Switching
  uses `map.setStyle()`; the app's sources, layers and brand images are
  re-injected on `styledata`/`idle`, and the camera is left untouched.
- Attribution: *OpenFreeMap © OpenMapTiles, Data from OpenStreetMap*.

### Phase 2 (planned)

Germany and Spain are implemented. The remaining neighbours (Belgium,
Luxembourg, Switzerland, Italy, Andorra, Monaco) will be added behind the same
country registry. Italy has an official per-station API but no CORS headers, so
it will reuse the Worker proxy. Belgium and Luxembourg only publish national
**maximum** prices (not per-station), so they need an OSM-based fallback.

Spain (`geoportalgasolineras`) and Germany (Tankerkönig) both border France and
provide per-station prices.

## Getting started

```bash
npm install
npm run dev        # start the dev server
```

Open the printed URL (default http://localhost:5173).

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm test` | Run unit/component tests (Vitest) |
| `npm run e2e` | Run end-to-end tests (Playwright) |
| `npm run e2e:ui` | Run Playwright in interactive UI mode |
| `npm run icons` | Regenerate the PWA icons |
| `npm run brands` | Regenerate the embedded brand marks |

> Playwright needs its browser once: `npx playwright install chromium`.

## Testing

- **Unit / component tests** (Vitest + Testing Library) live next to the source as
  `*.test.ts(x)`. jsdom is set up with `fake-indexeddb`, a stubbed `fetch` (no real
  network) and a mocked `maplibre-gl`.
- **End-to-end tests** (Playwright) live in `e2e/`. They **intercept the fuel API**
  with fixtures (`e2e/fixtures/`) so tests are hermetic and deterministic, and run
  against both a desktop and a mobile viewport.
- **Speed:** external services are stubbed for E2E: the heavy OpenFreeMap
  basemap (≈100 vector layers) becomes a one-layer style
  (`e2e/support/mockBasemap.ts`) and Overpass returns an empty set by default
  (`e2e/support/fixtures.ts`). Setup assertions wait on the **map source**
  rather than on rendered features (`e2e/support/map.ts`), which is fast and
  never flaky under parallel load. The whole suite runs in ~30 s of 80 tests.
  Specs must import `test` from `./support/fixtures` rather than
  `@playwright/test`.
- Covered flows: map + markers, fuel and advanced filters, station detail, navigation
  hand-off, favorites persistence, geolocation radius, theme/language, and the PWA.

```bash
npm test          # 60+ unit/component tests
npm run e2e       # 40+ end-to-end scenarios (desktop + mobile)
```

## Project structure

```
src/
├─ components/       # map, filters, station, favorites, settings, ui
├─ countries/        # country registry + per-country data adapters
│  ├─ types.ts       #   normalized domain model + FuelDataSource contract
│  └─ fr/            #   France: fuel catalog + DGCCRF adapter
├─ hooks/            # stations, filtered stations, geolocation, theme…
├─ i18n/             # i18next setup + locale files
├─ lib/              # api, db (IndexedDB), geo, format, navigation, map styles…
├─ stores/           # Zustand stores (filters, favorites, theme, ui, geo)
└─ styles/
e2e/                 # Playwright specs, fixtures and support helpers
```

### Adding a country (phase 2)

1. Create `src/countries/<cc>/` with a `FuelDataSource` adapter that normalizes the
   upstream data into `NormalizedStation`.
2. Register it in `src/countries/index.ts`.

Nothing else changes: the map, filters, formatting and sheets are all driven by the
active `CountryDefinition`.

## Internationalization

UI languages: `fr`, `uk`, `de`, `es`, `pt`, `it`, `nl` (fallback: `fr`). All
user-facing strings go through `t()`. Code, comments, commit messages and this
README are in English. Add a language by dropping a folder under
`src/i18n/locales/` and registering it in `src/i18n/index.ts`.

## Deployment (Cloudflare)

The app deploys as a **Cloudflare Worker that also serves the SPA**:

- **Build command:** `npm run build` (outputs `dist/`)
- **Deploy command:** `npx wrangler deploy`

`worker/index.ts` does two things:

1. serves the built assets from `dist/` (with SPA fallback), and
2. exposes `GET /api/de/stations` — a proxy in front of Tankerkönig so the
   German API key stays server-side and never ships to the browser,
   `GET /api/it/stations` — which fetches and joins the two MIMIT CSV files
   (no CORS upstream) and caches them at the edge,
   `GET /api/max-prices?country=BE|LU` — the official national maximum prices
   (Statbel CSV for Belgium, official price table for Luxembourg),
   `GET /api/osm/stations` — OpenStreetMap fuel stations via Overpass, tried
   across mirrors and cached at the edge for a week (used for the French brand
   enrichment and for Belgian / Luxembourg / Swiss station positions), and
   `GET /brands/<id>` + `GET /brands/manifest.json` — brand logos snapshotted
   from the Brandfetch Brand API into R2 (see below).
   `GET /api/geo` — a coarse location derived from the client IP
   (Cloudflare `request.cf`), used when geolocation is not authorized.

Set the secrets once (they never ship to the browser):

```bash
npx wrangler secret put TANKERKOENIG_API_KEY   # Germany (Tankerkönig)
npx wrangler secret put BRANDFETCH_API_KEY     # official brand logos
```

`wrangler.toml` also declares the **R2 bucket** holding the brand-logo snapshots
(`BRANDS_BUCKET` → `fuelmap-bucket`) and the **cron trigger** that refreshes them.

`wrangler.toml` sets **`keep_vars = true`** so environment variables configured
in the dashboard survive every deploy.

France and Spain need no backend: their APIs send permissive CORS headers and
are queried directly by the browser.

## Attribution & license

- Fuel data: **DGCCRF / data.economie.gouv.fr**, Licence Ouverte v2.0 (Etalab).
- Map data: **© OpenStreetMap contributors**, via **OpenFreeMap / OpenMapTiles**.
