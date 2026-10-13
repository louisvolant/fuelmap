import { expect, test } from "@playwright/test";
import { mockFuelApi } from "./support/mockFuelApi";
import { waitForStations } from "./support/map";

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await page.goto("/");
  await waitForStations(page);
});

test("exposes an installable web app manifest", async ({ page }) => {
  const href = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  expect(href).toBeTruthy();

  const response = await page.request.get(href as string);
  expect(response.ok()).toBe(true);

  const manifest = await response.json();
  expect(manifest.name).toBe("FuelMap");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
});

test("registers a service worker", async ({ page }) => {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          if (!("serviceWorker" in navigator)) return false;
          const registrations = await navigator.serviceWorker.getRegistrations();
          return registrations.length > 0;
        }),
      { timeout: 15_000 },
    )
    .toBe(true);
});
