import type { Page } from "@playwright/test";
import { FR_STATIONS_FIXTURE, type FrStationFixture } from "../fixtures/frStations";

const FUEL_API_PATTERN = /prix-des-carburants-en-france-flux-instantane-v2\/records/;

/**
 * Intercept the French fuel-price API and serve deterministic fixtures.
 *
 * This keeps end-to-end tests hermetic: they never depend on the live
 * government API, and station data (prices, fuels, update times) is stable.
 */
export async function mockFuelApi(
  page: Page,
  stations: FrStationFixture[] = FR_STATIONS_FIXTURE,
): Promise<void> {
  await page.route(FUEL_API_PATTERN, async (route) => {
    const url = new URL(route.request().url());
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const limit = Number(url.searchParams.get("limit") ?? "100");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        total_count: stations.length,
        results: stations.slice(offset, offset + limit),
      }),
    });
  });
}
