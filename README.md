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
- 🌍 **France, Spain and Germany** — switch country from the settings; each
  country brings its own fuel catalog and price source.
- 🏷️ **Brand logos on markers** — a round brand mark is shown on each price
  bubble (TotalEnergies, Esso, E.Leclerc, Carrefour, Avia, Système U,
  Intermarché, Netto, Shell, Fulli, Auchan, Eni, Dyneff, Élan, Match, Cora, BP).
- ⛽ **Fuel filter** — the active country's fuels; single or multi-select.
- 📋 **Sortable list** — stations ranked by price or by distance.
- 🧭 **Stations on your route** — pick a destination on the map, then keep only
  the stations along the driving route.
- 💶 **Prices on markers** — the selected fuel's price, shown from a given zoom.
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
- **Brands are derived from OpenStreetMap**: fuel nodes (`amenity=fuel`) with a
  `brand`/`operator`/`name` tag are fetched with Overpass for the current viewport
  (from zoom 11) and matched to the nearest official station within 60 m. Results
  are cached for a week. This is only used for France; Spain (`Rótulo`) and
  Germany (`brand`) expose brands natively.

### Brand marks

Brand logos live in `src/assets/brands/*.svg` as small, round SVG marks
(64×64, brand colour + short wordmark) and are registered as MapLibre images at
runtime. They are **simplified marks**, not the official artwork, so they stay
lightweight and fit inside a circular marker. To use official logos, replace the
matching file (same name, 64×64 viewBox) — nothing else needs to change. Brand
matching is alias-based (`src/lib/brands.ts`).

### Basemap

- **[OpenFreeMap](https://openfreemap.org/)** — free, unlimited vector tiles from
  OpenStreetMap data, no registration or API key.
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
   German API key stays server-side and never ships to the browser, and
   `GET /api/geo` — a coarse location derived from the client IP
   (Cloudflare `request.cf`), used when geolocation is not authorized.

Set the key once as a Worker secret:

```bash
npx wrangler secret put TANKERKOENIG_API_KEY
```

`wrangler.toml` sets **`keep_vars = true`** so environment variables configured
in the dashboard survive every deploy.

France and Spain need no backend: their APIs send permissive CORS headers and
are queried directly by the browser.

## Attribution & license

- Fuel data: **DGCCRF / data.economie.gouv.fr**, Licence Ouverte v2.0 (Etalab).
- Map data: **© OpenStreetMap contributors**, via **OpenFreeMap / OpenMapTiles**.
