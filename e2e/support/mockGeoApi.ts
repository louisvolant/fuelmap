import type { Page } from "@playwright/test";

export interface GeoIpFixture {
  country: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
}

const GEO_PATTERN = /\/api\/geo(\?|$)/;

/** Intercept the worker's IP-geolocation endpoint. */
export async function mockGeoApi(
  page: Page,
  result: GeoIpFixture = { country: null, city: null, lat: null, lon: null },
): Promise<void> {
  await page.route(GEO_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(result),
    });
  });
}
