import type { Page } from "@playwright/test";

export interface RadarFixtureFeature {
  id: string;
  type: string;
  maxSpeedKmh: number | null;
  commissionedAt: string;
  lon: number;
  lat: number;
}

/**
 * Intercept the Worker's fixed-radar endpoint with deterministic GeoJSON.
 * Empty by default so radar markers never interfere with station tests.
 */
export async function mockRadars(
  page: Page,
  radars: RadarFixtureFeature[] = [],
): Promise<void> {
  await page.route(/\/api\/fr\/radars$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/geo+json",
      body: JSON.stringify({
        type: "FeatureCollection",
        features: radars.map((radar) => ({
          type: "Feature",
          id: radar.id,
          geometry: {
            type: "Point",
            coordinates: [radar.lon, radar.lat],
          },
          properties: {
            id: radar.id,
            type: radar.type,
            maxSpeedKmh: radar.maxSpeedKmh,
            commissionedAt: radar.commissionedAt,
          },
        })),
      }),
    });
  });
}
