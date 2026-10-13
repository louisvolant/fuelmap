import type { Page } from "@playwright/test";
import { DE_STATIONS_FIXTURE } from "../fixtures/deStations";

const GERMANY_PROXY_PATTERN = /\/api\/de\/stations/;

/** Intercept the German stations proxy (Worker) and serve deterministic data. */
export async function mockGermanyApi(
  page: Page,
  stations: unknown[] = DE_STATIONS_FIXTURE,
): Promise<void> {
  await page.route(GERMANY_PROXY_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        license: "CC BY 4.0",
        data: "MTS-K",
        status: "ok",
        stations,
      }),
    });
  });
}
