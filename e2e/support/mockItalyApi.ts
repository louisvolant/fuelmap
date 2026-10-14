import type { Page } from "@playwright/test";
import { IT_STATIONS_FIXTURE } from "../fixtures/itStations";

const ITALY_API_PATTERN = /\/api\/it\/stations/;

/** Intercept the Italian stations proxy (Worker) and serve deterministic data. */
export async function mockItalyApi(
  page: Page,
  payload: unknown = IT_STATIONS_FIXTURE,
): Promise<void> {
  await page.route(ITALY_API_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
}
