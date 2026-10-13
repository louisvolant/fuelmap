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
- ⛽ **Fuel filter** — Gazole, SP95, SP98, E10, E85, GPLc; single or multi-select.
- 💶 **Prices on markers** — the selected fuel's price, shown from a given zoom.
- 📍 **Station detail sheet** — every fuel with its price, **last-update time**,
  shortages, services and opening hours.
- 🧭 **Navigation hand-off** — one tap to **Waze**, **Google Maps** or **Apple Maps**.
- ⭐ **Local favorites** — stored in **IndexedDB**, highlighted on the map, offline-friendly.
- 🎛️ **Advanced filters** — hide shortages, 24/7 automated pumps only, required
  services, and a radius around your position.
- 📌 **Geolocation** — recenter on your position at any time.
- 🌗 **Light / dark theme**, following the system by default.
- 🌍 **7 UI languages** — `fr`, `uk`, `de`, `es`, `pt`, `it`, `nl`.
- 📱 **Installable PWA** — offline app shell, cached tiles and prices.

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

### Basemap

- **[OpenFreeMap](https://openfreemap.org/)** — free, unlimited vector tiles from
  OpenStreetMap data, no registration or API key.
- Attribution: *OpenFreeMap © OpenMapTiles, Data from OpenStreetMap*.

### Phase 2 (planned)

Other countries bordering France will be added behind a country registry:
Belgium, Luxembourg, Germany, Switzerland, Italy, Spain, Andorra, Monaco.
Pricing sources are national and heterogeneous (e.g. Tankerkoenig for Germany,
`geoportalgasolineras` for Spain); where no pricing source exists, OpenStreetMap
`amenity=fuel` can supply station locations.

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

The app is a static SPA and deploys to **Cloudflare Pages**:

- **Build command:** `npm run build`
- **Output directory:** `dist`

No backend is required for the MVP: the OpenDataSoft API sends permissive CORS
headers, so the browser queries it directly. A `wrangler.toml` is committed with
**`keep_vars = true`** so that, if a Cloudflare Worker is added later (edge caching,
server-side aggregation, or a proxy for non-CORS sources), dashboard environment
variables are preserved across deploys.

SPA routing is handled by `public/_redirects`.

## Attribution & license

- Fuel data: **DGCCRF / data.economie.gouv.fr**, Licence Ouverte v2.0 (Etalab).
- Map data: **© OpenStreetMap contributors**, via **OpenFreeMap / OpenMapTiles**.
