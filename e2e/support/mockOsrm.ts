import type { Page } from "@playwright/test";

const OSRM_PATTERN = /router\.project-osrm\.org\/route\/v1\/driving\//;

/**
 * Intercept the routing backend and return a fixed route.
 * `coordinates` is a GeoJSON LineString, i.e. `[lon, lat]` pairs.
 */
export async function mockRoute(
  page: Page,
  coordinates: [number, number][],
  options: { distanceMeters?: number; durationSeconds?: number } = {},
): Promise<void> {
  await page.route(OSRM_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: "Ok",
        routes: [
          {
            geometry: { type: "LineString", coordinates },
            distance: options.distanceMeters ?? 12_000,
            duration: options.durationSeconds ?? 900,
          },
        ],
      }),
    });
  });
}
