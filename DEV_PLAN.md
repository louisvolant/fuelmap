# FuelMap — Development Plan

> A free, full-screen-map fuel price comparator inspired by **Essence&Co**.
> **Phase 1 (MVP) targets France.** The architecture is designed from day one to accept
> additional European countries (phase 2) without rework.
>
> Stack: **React + Vite + TypeScript + MapLibre GL JS + OpenFreeMap + Tailwind CSS**.
> Deployed as a static PWA on **Cloudflare**.

---

## 1. Vision

A mobile-first PWA, no account, that shows **every French fuel station on a full-screen map**,
lets users **filter by fuel type**, inspect **prices and how fresh they are**, **hand off
navigation to Waze / Google Maps / Apple Maps**, and **save favorite stations locally**
(IndexedDB).

Guiding principles:

- **Map first** — the primary surface is the map, not a list.
- **No backend required for the MVP** — a static client reading open data.
- **No account, no tracking** — favorites and settings stay on the device.
- **Official data** — prices come from the French government open data, not crowd-sourced.
- **Multi-country ready** — country-specific logic is isolated behind a registry so adding
  Spain, Germany, Italy… is a matter of adding a module.

---

## 2. Scope

### MVP (phase 1 — France)
- Full-screen map with station markers (clustered)
- Fuel filter (single and multi select)
- Station detail sheet: all fuels, prices, **last-update time per fuel**, shortages, services,
  opening hours
- Navigation hand-off: Waze / Google Maps / Apple Maps
- Local favorites (IndexedDB)
- Geolocation + recenter
- Installable PWA, light/dark theme
- 7 UI locales: `fr`, `uk`, `de`, `es`, `pt`, `it`, `nl`

### Phase 2 (planned, not built now)
- Additional countries **bordering France**: Belgium, Luxembourg, Germany, Switzerland, Italy,
  Spain, Andorra, Monaco (plus UK/Ireland possible later).
- Per-country price sources (national open-data APIs).
- OSM `amenity=fuel` fallback for stations without a pricing source.
- Route search ("stations along my route"), fill-up history, savings tracker.

### Explicitly out of scope
- User accounts / cloud sync
- Ads, premium, payments
- Crowd-sourced price reporting
- Fuel stations outside the supported countries list

---

## 3. Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Build tool | **Vite** | Fast dev server, static output for Cloudflare Pages |
| UI | **React 18 + TypeScript** | Strict mode |
| Map | **MapLibre GL JS** | Free, no API key |
| Basemap | **OpenFreeMap** | Vector tiles, unlimited, no key, OSM data |
| Styling | **Tailwind CSS v4** | Via `@tailwindcss/vite` |
| Global/UI state | **Zustand** (+ `persist`) | Filters, theme, selected station |
| Server state / cache | **TanStack Query** | Fetch, retry, refetch interval |
| Local storage | **IndexedDB via `idb`** | Stations cache, favorites, meta |
| i18n | **i18next + react-i18next** | 7 locales, lazy-loaded |
| PWA | **vite-plugin-pwa** (Workbox) | Manifest, service worker, offline shell |
| Tests | **Vitest** + Testing Library | Unit tests colocated |
| Quality | **ESLint + Prettier** | |

---

## 4. Internationalization (i18n)

### Locales
`fr`, `uk`, `de`, `es`, `pt`, `it`, `nl`. Fallback: `fr`.

### Rules
- **All user-facing strings go through `t()`.** No hardcoded copy in components.
- Code, identifiers, comments, commit messages, and the README are **English**; only the
  translation files contain non-English strings.
- Translation files live in `src/i18n/locales/<lng>/<namespace>.json`.
- Namespaces: `common`, `map`, `filters`, `station`, `navigation`, `favorites`, `settings`,
  `errors`.
- Language detection order: saved preference → browser → `fr`. Persisted in `localStorage`.
- A compact language switcher is exposed in the settings panel.
- Number/currency/date formatting uses `Intl` with the active locale.

### Adding a locale
Drop a new folder under `src/i18n/locales/` and register it in `src/i18n/index.ts`. No other
change required.

---

## 5. Multi-country architecture (phase 2 preparedness)

Even though the MVP only ships France, everything country-specific is abstracted now.

### 5.1 Country registry

```ts
// src/countries/types.ts
export type CountryCode = "FR" | "BE" | "LU" | "DE" | "CH" | "IT" | "ES" | "AD" | "MC";

export interface FuelDefinition {
  id: string;             // internal id, e.g. "gazole", "e10"
  labelKey: string;       // i18n key
  color: string;          // marker/badge color
  aliases: string[];      // source-specific names, e.g. "Gazole", "Diesel"
}

export interface CountryDefinition {
  code: CountryCode;
  center: [number, number];      // [lon, lat] default map center
  bounds: [number, number, number, number]; // bbox
  currency: string;              // ISO 4217, e.g. "EUR", "CHF"
  fuelCatalog: FuelDefinition[];  // fuels available in this country
  dataSource: FuelDataSource | null; // null => no pricing source yet (OSM only)
}
```

```ts
// src/countries/types.ts
export interface FuelDataSource {
  id: string;
  /** Fetch all normalized stations, optionally bounded. */
  fetchStations(options?: { signal?: AbortSignal }): Promise<NormalizedStation[]>;
  /** Refresh cadence hint in ms. */
  refreshIntervalMs: number;
  attribution: string;
}
```

### 5.2 Normalized model (source-agnostic)

Every data source returns the same `NormalizedStation`. Country-specific quirks (raw field
names, coordinate encoding, currency, fuel labels) are handled **inside the source adapter**,
never in the UI.

```ts
export type Currency = string;

export interface NormalizedFuelPrice {
  fuelId: string;         // matches FuelDefinition.id
  price: number;          // in the country's currency, per liter
  currency: Currency;
  updatedAt: string;      // ISO 8601
  shortage?: { type: "temporary" | "definitive"; since?: string };
}

export interface NormalizedStation {
  /** Globally unique: `${country}:${sourceId}` */
  id: string;
  country: CountryCode;
  lat: number;
  lon: number;
  address?: string;
  city?: string;
  postalCode?: string;
  brand?: string;          // optional, may be undefined (not in FR open data)
  isHighway: boolean;
  fuels: NormalizedFuelPrice[];
  services: string[];
  openingHours?: OpeningHours;
  automat24h: boolean;
  sourceId: string;        // raw id from the provider
}
```

### 5.3 Registering a country

```ts
// src/countries/index.ts
import { france } from "./fr";

export const COUNTRIES: Record<CountryCode, CountryDefinition> = {
  FR: france,
  // BE: belgium, DE: germany, ... added in phase 2
};
```

The UI reads the active country from `useCountryStore` and pulls its `fuelCatalog`
(filters), `center`/`bounds` (map), `currency` (formatting), and `dataSource` (data).
**Switching country later = one registry entry + one adapter file.**

### 5.4 Data sources by country (phase 2 reference)

| Country | Pricing source | Status |
|---|---|---|
| 🇫🇷 FR | DGCCRF open data (`data.economie.gouv.fr`, ODS API) | **MVP** |
| 🇩🇪 DE | Tankerkoenig API | phase 2 |
| 🇪🇸 ES | Ministerio `geoportalgasolineras` | phase 2 |
| 🇮🇹 IT | MIMIT / Osservaprezzi | phase 2 |
| 🇧🇪 BE / 🇱🇺 LU / 🇨🇭 CH / 🇦🇩 AD / 🇲🇨 MC | OSM `amenity=fuel` (positions only, no prices) or national APIs | phase 2 |
| Any | OpenStreetMap `amenity=fuel` | fallback |

---

## 6. Primary data source — France

- **Dataset**: *Prix des carburants en France — Flux instantané — v2* (DGCCRF)
- **License**: Licence Ouverte v2.0 (Etalab) — reuse allowed, attribution required.
- **Refresh**: every **10 minutes** at the source; ~**9 800** stations.
- **Endpoint** (Opendatasoft Explore v2.1):
  ```
  GET https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records
  ```
  Useful params: `limit` (max **100**), `offset`, `where`, `order_by`, `select`, `refine`.
  Geo filter example:
  ```
  where=within_distance(geom, geom'POINT(2.3522 48.8566)', 5km)
  ```

### Fields used

| Field | Usage |
|---|---|
| `id` | Raw station id |
| `geom` (`{ lon, lat }`) | **Authoritative coordinates** |
| `adresse`, `ville`, `cp` | Address |
| `departement`, `region` | Context/search |
| `pop` | `A` = highway, `R` = road → badge |
| `*_prix` / `*_maj` | Price and **last-update time** per fuel |
| `*_rupture_debut` / `*_rupture_type` | Shortages |
| `services_service` | Services |
| `horaires` | Opening hours (JSON string) |
| `horaires_automate_24_24` | 24/7 pump |

> ⚠️ **Pitfall 1 — `latitude`/`longitude` are integers ×100 000** (e.g. `4818300` → 48.183).
> **Never use them.** Use `geom`.

> ⚠️ **Pitfall 2 — no brand name.** The official API exposes neither brand nor station name.
> MVP shows **address + city + highway badge**. Optional `id → brand` mapping deferred to
> phase 2.

### Fuel mapping (FR)

| Raw name | Internal id | Price field | Update field |
|---|---|---|---|
| Gazole | `gazole` | `gazole_prix` | `gazole_maj` |
| SP95 | `sp95` | `sp95_prix` | `sp95_maj` |
| E85 | `e85` | `e85_prix` | `e85_maj` |
| GPLc | `gplc` | `gplc_prix` | `gplc_maj` |
| E10 | `e10` | `e10_prix` | `e10_maj` |
| SP98 | `sp98` | `sp98_prix` | `sp98_maj` |

### Basemap — OpenFreeMap

- Vector tiles, free, unlimited, **no API key**.
- Styles: `liberty`, `bright`, `positron`, `dark`, `fiord`, `3d`.
- Style URL: `https://tiles.openfreemap.org/styles/<style>`
- Rendered with MapLibre GL JS (OSM/OpenFreeMap attribution is automatic).

---

## 7. Architecture

### 7.1 Folder structure

```
fuelmap/
├─ public/
│  ├─ icons/                     # PWA icons (192/512/maskable)
│  └─ manifest.webmanifest
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ components/
│  │  ├─ map/
│  │  │  ├─ MapCanvas.tsx            # MapLibre + OpenFreeMap, fullscreen
│  │  │  ├─ StationMarkers.tsx       # GeoJSON layer + clustering + price labels
│  │  │  ├─ UserLocationLayer.tsx
│  │  │  ├─ MapControls.tsx          # zoom, recenter
│  │  │  └─ MapStyleSwitcher.tsx
│  │  ├─ filters/
│  │  │  ├─ FuelFilterBar.tsx
│  │  │  ├─ FilterSheet.tsx          # radius, services, shortages, 24/7
│  │  │  └─ ActiveFilterChips.tsx
│  │  ├─ station/
│  │  │  ├─ StationSheet.tsx
│  │  │  ├─ FuelPriceRow.tsx
│  │  │  ├─ ServicesList.tsx
│  │  │  ├─ OpeningHours.tsx
│  │  │  └─ NavigationButtons.tsx
│  │  ├─ favorites/
│  │  │  ├─ FavoriteToggle.tsx
│  │  │  └─ FavoritesSheet.tsx
│  │  ├─ search/
│  │  │  └─ SearchBar.tsx
│  │  ├─ settings/
│  │  │  ├─ SettingsSheet.tsx
│  │  │  └─ LanguageSwitcher.tsx
│  │  └─ ui/                         # Button, Sheet, Badge, Skeleton, Icon…
│  ├─ countries/
│  │  ├─ types.ts
│  │  ├─ index.ts                    # registry
│  │  └─ fr/
│  │     ├─ index.ts                 # CountryDefinition
│  │     ├─ dataSource.ts            # ODS adapter → NormalizedStation
│  │     └─ fuels.ts
│  ├─ hooks/
│  │  ├─ useStations.ts
│  │  ├─ useFilteredStations.ts
│  │  ├─ useGeolocation.ts
│  │  ├─ useFavorites.ts
│  │  └─ useMediaQuery.ts
│  ├─ lib/
│  │  ├─ api/odsClient.ts            # paginated fetch helper
│  │  ├─ db/indexedDb.ts             # schema + accessors
│  │  ├─ geo.ts                      # haversine, bbox, formatDistance
│  │  ├─ navigation.ts              # Waze/GMaps/Plans deep links
│  │  ├─ format.ts                  # Intl number/currency/date
│  │  └─ freshness.ts               # "2 h ago" formatting
│  ├─ stores/
│  │  ├─ filterStore.ts
│  │  ├─ countryStore.ts
│  │  └─ uiStore.ts
│  ├─ i18n/
│  │  ├─ index.ts
│  │  └─ locales/{fr,uk,de,es,pt,it,nl}/*.json
│  ├─ types/
│  │  └─ geo.ts
│  └─ styles/index.css
├─ workers/                      # optional (see §9)
├─ docs/
├─ DEV_PLAN.md
├─ README.md
├─ wrangler.toml
├─ vite.config.ts
├─ tsconfig.json
└─ package.json
```

### 7.2 Data flow

```
CountryDataSource (FR: ODS API)
        │  TanStack Query (refetch every 10 min)
        ▼
NormalizedStation[]  ──►  IndexedDB cache (stations + meta.lastSync)
        │
        │  filterStore (fuel, radius, shortages, services, 24/7)
        ▼
Filtered stations ──► GeoJSON source ──► MapLibre markers + clusters
        │
        └── selected station ──► StationSheet
```

- **First load**: paginated fetch of all stations (~98 pages of 100) → IndexedDB. Subsequent
  loads are instant from cache, revalidated in background.
- **Optional bbox-first** strategy to paint the visible area immediately, then complete.
- **Filtering is client-side** over the cached dataset → instantaneous updates.
- **Per-country cache key** so multiple countries can coexist later.

---

## 8. IndexedDB schema (via `idb`)

| Store | Key | Value | Notes |
|---|---|---|---|
| `stations` | `id` | `NormalizedStation` | Main cache; index on `country` |
| `favorites` | `id` | `{ id, country, addedAt }` | Local favorites |
| `meta` | `key` | `{ key, value }` | `lastSync:FR`, schema version |

Schema versioning + migration path planned. Favorites are plain local data, no server.

---

## 9. Deployment — Cloudflare

The MVP is a **static SPA** and deploys directly to **Cloudflare Pages** (`vite build` → `dist/`).
No backend is required because the OpenDataSoft API sends permissive CORS headers.

### Anticipated backend (optional, phase 1.1+)
If we later add a Cloudflare Worker (e.g. to aggregate/paginate the ~98 requests server-side,
cache prices at the edge, or proxy a non-CORS source), we will:

1. Add a `workers/` project with its own `wrangler.toml`.
2. Set **`keep_vars = true`** so environment variables configured in the Cloudflare dashboard
   are **not wiped** on each deploy.
3. Keep the `FuelDataSource` interface identical, so the client only swaps its `baseUrl`.

A root `wrangler.toml` is committed **from the start** with `keep_vars = true` and a
documented, commented `[vars]` section, so this switch is low-friction.

---

## 10. Git & commit conventions

- **One commit = one feature.** No mixed commits (code + tests + README belong together).
- **Commit messages in English, one line** (imperative mood), e.g.
  `feat: render clustered fuel station markers`.
- Conventional-commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`,
  `perf:`.
- Commit frequently; push at the end.

---

## 11. Roadmap / milestones

| # | Milestone | Commit (feature) |
|---|---|---|
| M0 | Development plan | `docs: add development plan` |
| M1 | Project scaffold (Vite/React/TS) | `chore: scaffold vite react typescript app` |
| M2 | Tailwind setup | `chore: configure tailwind css` |
| M3 | Lint/format/tests tooling | `chore: add eslint prettier and vitest` |
| M4 | Cloudflare config (`keep_vars=true`) | `chore: add cloudflare pages and worker config` |
| M5 | i18n, 7 locales | `feat: add i18n support for seven locales` |
| M6 | Domain model + fuel catalog | `feat: add fuel domain model and catalog` |
| M7 | Country registry + FR adapter | `feat: add country registry and france data source` |
| M8 | Fullscreen OpenFreeMap map | `feat: add fullscreen openfreemap map` |
| M9 | IndexedDB layer | `feat: add indexeddb storage layer` |
| M10 | Station loading + caching | `feat: load and cache stations with tanstack query` |
| M11 | Station markers + clustering | `feat: render clustered station markers with price labels` |
| M12 | Fuel filter | `feat: add fuel type filter` |
| M13 | Advanced filters | `feat: add radius availability and service filters` |
| M14 | Station detail sheet | `feat: add station detail sheet with price freshness` |
| M15 | Navigation hand-off | `feat: add waze google maps and apple maps handoff` |
| M16 | Favorites | `feat: add local favorites with indexeddb` |
| M17 | Geolocation + recenter | `feat: add geolocation and recenter control` |
| M18 | Theme light/dark | `feat: add light and dark theme switcher` |
| M19 | PWA | `feat: add pwa manifest and offline service worker` |
| M20 | README | `docs: add readme` |

---

## 12. Risks & mitigations

| Risk / constraint | Impact | Mitigation |
|---|---|---|
| No brand/name in FR open data | No brand logos | Address + highway badge; optional id→brand map later |
| ~9 800 stations to load | Slow first paint | Paginated fetch + IndexedDB cache + optional bbox-first |
| API `limit` capped at 100 | ~98 requests for full set | Parallel pagination with throttling; optional Worker aggregation |
| `latitude` is ×100 000 | Wrong marker placement | Use `geom` only |
| Variable price freshness | User trust | Always show per-fuel last-update time |
| Third-party basemap dependency | Availability | Cacheable tiles/styles; self-host OpenFreeMap as fallback |
| Multi-country divergence | UI complexity | Country registry + normalized model; quirks isolated in adapters |

---

## 13. Acceptance criteria (MVP)

- [ ] Full-screen map using the OpenFreeMap basemap.
- [ ] French stations rendered with the **selected fuel's price** on markers (from a given zoom).
- [ ] Fuel filter (single and multi) updates the map **instantly**.
- [ ] Selecting a station shows its fuels with **price and last-update time**.
- [ ] Waze / Google Maps / Apple Maps buttons open the correct route.
- [ ] Favorites persist across reloads (IndexedDB) and appear on the map.
- [ ] App is **installable** (PWA) and usable on mobile.
- [ ] Works in **light and dark** themes.
- [ ] UI available in `fr`, `uk`, `de`, `es`, `pt`, `it`, `nl`.
- [ ] Adding a new country requires only a registry entry + one adapter file.
