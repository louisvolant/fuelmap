import type { Page } from "@playwright/test";

// Version-agnostic on purpose: the endpoint path is versioned (`/api/osm/v3/...`)
// so a stale CDN cache can be bypassed, and the mock must not need updating then.
const OSM_STATIONS_PATTERN = /\/api\/osm\/(v\d+\/)?stations/;

export interface OsmStationFixture {
  key?: string;
  lat: number;
  lon: number;
  brand?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  opening24h?: boolean;
}

/**
 * Intercept the Worker's OpenStreetMap endpoint with deterministic stations.
 * Used both for the French brand enrichment and for the OpenStreetMap station
 * source of Belgium / Luxembourg / Switzerland.
 */
export async function mockOsmStations(
  page: Page,
  stations: OsmStationFixture[] = [],
): Promise<void> {
  await page.route(OSM_STATIONS_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        stations: stations.map((station, index) => ({
          key: `node/${index + 1}`,
          opening24h: false,
          ...station,
        })),
      }),
    });
  });
}
